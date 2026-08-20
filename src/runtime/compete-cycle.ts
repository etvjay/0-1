import { executeBoundedBuy } from "../execution/live-buy.js";
import { getPortfolioSnapshot } from "../delphi/portfolio.js";
import { sweepSettledPositions } from "../delphi/settlement.js";
import { createResearchProviders } from "../forecast/research/providers.js";
import { huntOpportunities } from "../hunt/orchestrator.js";
import { sha256Json, writeJsonAtomic } from "../history/io.js";
import {
  loadRuntimeState,
  opportunityKey,
  pruneRecentTrades,
  recentlyTraded,
  recordTrade,
  saveRuntimeState,
  type PendingTradeState,
} from "./state.js";

const numberEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`${name} must be numeric`);
  return value;
};

const liveEnabled = () => (process.env.ZERO_ONE_LIVE_TRADING ?? "false").toLowerCase() === "true";

export interface CompeteCycleResult {
  mode: "LIVE" | "SHADOW";
  actionable: number;
  enqueued: number;
  attempted: number;
  executed: number;
  failed: number;
  skippedCooldown: number;
  spentEstimateTst: number;
  transactions: string[];
  wallet: `0x${string}` | null;
  accountValueTst: number;
  collateralBalanceTst: number;
  markedPositionsTst: number;
  cashReserveTst: number;
  deployableCashTst: number;
  redeemedMarkets: string[];
  liquidatedMarkets: string[];
  settlementFailures: number;
  huntReportPath: string | null;
}

const pendingFromResult = (result: any, accountValue: number, marketExposure: number): PendingTradeState | null => {
  const proposal = result.bestSide?.bestProposal;
  const forecast = result.forecast;
  if (!proposal || !forecast) return null;
  const key = opportunityKey(proposal.marketId, proposal.outcomeIndex);
  return {
    id: sha256Json({ key, generatedAtMs: forecast.generatedAtMs, shares: proposal.shares, probability: proposal.ourProbability }),
    marketId: proposal.marketId,
    outcomeIndex: proposal.outcomeIndex,
    shares: proposal.shares,
    probability: proposal.ourProbability,
    confidence: forecast.confidence,
    accountValue,
    marketExposure,
    beliefCreatedAtMs: forecast.generatedAtMs,
    beliefExpiresAtMs: forecast.expiresAtMs,
    method: forecast.method,
    createdAtMs: Date.now(),
    attempts: 0,
    lastAttemptAtMs: null,
    lastError: null,
  };
};

const tryPending = async (pending: PendingTradeState) => executeBoundedBuy({
  marketId: pending.marketId,
  outcomeIndex: pending.outcomeIndex,
  shares: pending.shares,
  probability: pending.probability,
  confidence: pending.confidence,
  accountValue: pending.accountValue,
  marketExposure: pending.marketExposure,
  beliefCreatedAtMs: pending.beliefCreatedAtMs,
  beliefExpiresAtMs: pending.beliefExpiresAtMs,
  method: pending.method,
});

export async function runCompeteCycle(): Promise<CompeteCycleResult> {
  const statePath = process.env.ZERO_ONE_RUNTIME_STATE ?? "data/runtime/runtime-state.json";
  const state = await loadRuntimeState(statePath);
  state.lastCycleStartedAtMs = Date.now();
  pruneRecentTrades(state, numberEnv("ZERO_ONE_TRADE_RETENTION_MS", 24 * 60 * 60 * 1000));
  await saveRuntimeState(statePath, state);

  const live = liveEnabled();
  let redeemedMarkets: string[] = [];
  let liquidatedMarkets: string[] = [];
  let settlementFailures = 0;

  if (live) {
    try {
      const sweep = await sweepSettledPositions();
      redeemedMarkets = sweep.redeemedMarkets;
      liquidatedMarkets = sweep.liquidatedMarkets;
      settlementFailures = sweep.failures.length;
    } catch {
      settlementFailures = 1;
    }
  }

  let wallet: `0x${string}` | null = null;
  let accountValue = numberEnv("ZERO_ONE_HUNT_ACCOUNT_VALUE", 100);
  let collateralBalanceTst = accountValue;
  let markedPositionsTst = 0;
  let marketExposureByMarket: Record<string, number> = {};

  try {
    const portfolio = await getPortfolioSnapshot();
    wallet = portfolio.wallet;
    accountValue = portfolio.accountValueTst;
    collateralBalanceTst = portfolio.collateralBalanceTst;
    markedPositionsTst = portfolio.markedPositionsTst;
    marketExposureByMarket = portfolio.marketExposureTst;
  } catch (error) {
    if (live) throw error;
  }

  const cashReserveTst = Math.max(0, numberEnv("ZERO_ONE_CASH_RESERVE_TST", 0));
  const deployableCashTst = Math.max(0, collateralBalanceTst - cashReserveTst);
  const cycleBudgetTst = Math.min(numberEnv("ZERO_ONE_MAX_CYCLE_TST", 20), deployableCashTst);
  const cooldownMs = numberEnv("ZERO_ONE_MARKET_COOLDOWN_MS", 30 * 60 * 1000);
  const retryDelayMs = numberEnv("ZERO_ONE_PENDING_RETRY_MS", 30_000);

  const result: CompeteCycleResult = {
    mode: live ? "LIVE" : "SHADOW",
    actionable: 0,
    enqueued: 0,
    attempted: 0,
    executed: 0,
    failed: 0,
    skippedCooldown: 0,
    spentEstimateTst: 0,
    transactions: [],
    wallet,
    accountValueTst: accountValue,
    collateralBalanceTst,
    markedPositionsTst,
    cashReserveTst,
    deployableCashTst,
    redeemedMarkets,
    liquidatedMarkets,
    settlementFailures,
    huntReportPath: null,
  };

  if (live) {
    for (const [key, pending] of Object.entries(state.pendingTrades)) {
      if (pending.beliefExpiresAtMs <= Date.now()) {
        delete state.pendingTrades[key];
        await saveRuntimeState(statePath, state);
        continue;
      }
      if (pending.lastAttemptAtMs && Date.now() - pending.lastAttemptAtMs < retryDelayMs) continue;
      if (result.spentEstimateTst >= cycleBudgetTst) break;

      pending.attempts += 1;
      pending.lastAttemptAtMs = Date.now();
      await saveRuntimeState(statePath, state);
      result.attempted += 1;
      try {
        const receipt = await tryPending(pending);
        if (result.spentEstimateTst + receipt.quotedCost > cycleBudgetTst) {
          throw new Error(`Fresh quoted cost would exceed cycle/deployable cash budget ${cycleBudgetTst.toFixed(6)} TST.`);
        }
        result.executed += 1;
        result.spentEstimateTst += receipt.quotedCost;
        result.transactions.push(receipt.transactionHash);
        recordTrade(state, pending.marketId, pending.outcomeIndex, receipt.transactionHash, receipt.submittedAtMs);
        delete state.pendingTrades[key];
        state.consecutiveFailures = 0;
        await saveRuntimeState(statePath, state);
      } catch (error) {
        pending.lastError = error instanceof Error ? error.message : String(error);
        state.consecutiveFailures += 1;
        result.failed += 1;
        await saveRuntimeState(statePath, state);
      }
    }
  }

  const providers = createResearchProviders();
  const report = await huntOpportunities(
    providers.search,
    providers.opinion,
    {
      marketLimit: numberEnv("ZERO_ONE_HUNT_MARKET_LIMIT", 100),
      researchBudget: numberEnv("ZERO_ONE_HUNT_RESEARCH_BUDGET", 8),
      accountValue,
      marketExposure: 0,
      marketExposureByMarket,
      maxPriorDrift: numberEnv("ZERO_ONE_HUNT_MAX_PRIOR_DRIFT", 0.08),
    },
  );
  const huntReportDir = process.env.ZERO_ONE_HUNT_REPORT_DIR ?? "data/hunt/reports";
  const huntReportPath = `${huntReportDir}/${report.generatedAtMs}-compete.json`;
  await writeJsonAtomic(huntReportPath, report);
  result.huntReportPath = huntReportPath;

  const actionable = report.results.filter((item) => item.status === "ACTIONABLE" && item.bestSide?.bestProposal);
  result.actionable = actionable.length;

  if (live) {
    for (const item of actionable) {
      const proposal = item.bestSide?.bestProposal;
      if (!proposal) continue;
      const marketExposure = marketExposureByMarket[proposal.marketId] ?? 0;
      const pending = pendingFromResult(item, accountValue, marketExposure);
      if (!pending) continue;
      const key = opportunityKey(pending.marketId, pending.outcomeIndex);
      if (state.pendingTrades[key]) continue;
      if (recentlyTraded(state, pending.marketId, pending.outcomeIndex, cooldownMs)) {
        result.skippedCooldown += 1;
        continue;
      }
      const estimatedCost = proposal.quotedCost ?? 0;
      if (estimatedCost <= 0 || result.spentEstimateTst + estimatedCost > cycleBudgetTst) continue;

      state.pendingTrades[key] = pending;
      result.enqueued += 1;
      await saveRuntimeState(statePath, state);

      pending.attempts += 1;
      pending.lastAttemptAtMs = Date.now();
      await saveRuntimeState(statePath, state);
      result.attempted += 1;
      try {
        const receipt = await tryPending(pending);
        if (result.spentEstimateTst + receipt.quotedCost > cycleBudgetTst) {
          throw new Error(`Fresh quoted cost would exceed cycle/deployable cash budget ${cycleBudgetTst.toFixed(6)} TST.`);
        }
        result.executed += 1;
        result.spentEstimateTst += receipt.quotedCost;
        result.transactions.push(receipt.transactionHash);
        recordTrade(state, pending.marketId, pending.outcomeIndex, receipt.transactionHash, receipt.submittedAtMs);
        delete state.pendingTrades[key];
        state.consecutiveFailures = 0;
        await saveRuntimeState(statePath, state);
      } catch (error) {
        pending.lastError = error instanceof Error ? error.message : String(error);
        state.consecutiveFailures += 1;
        result.failed += 1;
        await saveRuntimeState(statePath, state);
      }
    }
  }

  state.cyclesCompleted += 1;
  state.lastCycleFinishedAtMs = Date.now();
  await saveRuntimeState(statePath, state);
  return result;
}
