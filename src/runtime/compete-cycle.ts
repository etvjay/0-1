import { executeBoundedBuy } from "../execution/live-buy.js";
import { createResearchProviders } from "../forecast/research/providers.js";
import { huntOpportunities } from "../hunt/orchestrator.js";
import { sha256Json } from "../history/io.js";
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
}

const pendingFromResult = (result: any, accountValue: number, marketExposure: number): PendingTradeState | null => {
  const proposal = result.bestSide?.bestProposal;
  const council = result.council;
  if (!proposal || !council || council.status !== "FORECAST") return null;
  const key = opportunityKey(proposal.marketId, proposal.outcomeIndex);
  return {
    id: sha256Json({ key, generatedAtMs: council.generatedAtMs, shares: proposal.shares, probability: proposal.ourProbability }),
    marketId: proposal.marketId,
    outcomeIndex: proposal.outcomeIndex,
    shares: proposal.shares,
    probability: proposal.ourProbability,
    confidence: council.confidence,
    accountValue,
    marketExposure,
    beliefCreatedAtMs: council.generatedAtMs,
    beliefExpiresAtMs: council.expiresAtMs,
    method: council.method,
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
  const accountValue = numberEnv("ZERO_ONE_HUNT_ACCOUNT_VALUE", 100);
  const marketExposure = numberEnv("ZERO_ONE_HUNT_MARKET_EXPOSURE", 0);
  const cycleBudgetTst = numberEnv("ZERO_ONE_MAX_CYCLE_TST", 20);
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
        result.executed += 1;
        result.spentEstimateTst += receipt.quotedCost;
        result.transactions.push(receipt.transactionHash);
        recordTrade(state, pending.marketId, pending.outcomeIndex, receipt.transactionHash, receipt.submittedAtMs);
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
      marketExposure,
      maxPriorDrift: numberEnv("ZERO_ONE_HUNT_MAX_PRIOR_DRIFT", 0.08),
    },
  );

  const actionable = report.results.filter((item) => item.status === "ACTIONABLE" && item.bestSide?.bestProposal);
  result.actionable = actionable.length;

  if (live) {
    for (const item of actionable) {
      const pending = pendingFromResult(item, accountValue, marketExposure);
      if (!pending) continue;
      const key = opportunityKey(pending.marketId, pending.outcomeIndex);
      if (state.pendingTrades[key]) continue;
      if (recentlyTraded(state, pending.marketId, pending.outcomeIndex, cooldownMs)) {
        result.skippedCooldown += 1;
        continue;
      }
      const estimatedCost = item.bestSide?.bestProposal?.quotedCost ?? 0;
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
        result.executed += 1;
        result.spentEstimateTst += receipt.quotedCost;
        result.transactions.push(receipt.transactionHash);
        recordTrade(state, pending.marketId, pending.outcomeIndex, receipt.transactionHash, receipt.submittedAtMs);
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
