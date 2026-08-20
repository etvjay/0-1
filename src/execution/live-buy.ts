import { tradePolicy } from "../config.js";
import { competitionScope, collateralToNumber, delphi, sharesToBigint } from "../delphi/client.js";
import { evaluateTrade } from "../domain/evaluate.js";
import type { MarketBelief, MarketSnapshot, PortfolioState, QuoteObservation, TradeProposal } from "../domain/types.js";
import { appendJsonl, sha256Json } from "../history/io.js";

const numberEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be numeric`);
  return parsed;
};

export interface LiveBuyInput {
  marketId: `0x${string}`;
  outcomeIndex: number;
  shares: number;
  probability: number;
  confidence: number;
  accountValue: number;
  marketExposure: number;
  beliefCreatedAtMs?: number;
  beliefExpiresAtMs?: number;
  method?: string;
  maxSpendTst?: number;
}

export interface LiveBuyReceipt {
  schemaVersion: "0-1.live-buy.v1";
  id: string;
  submittedAtMs: number;
  marketId: `0x${string}`;
  outcomeIndex: number;
  shares: number;
  ourProbability: number;
  confidence: number;
  marketProbability: number;
  quotedCost: number;
  averageExecutionPrice: number;
  executionEdge: number;
  maxTokensInAtomic: string;
  transactionHash: string;
  method: string;
}

const slippageCap = (tokensIn: bigint, bps: number): bigint => {
  const numerator = tokensIn * BigInt(10_000 + Math.max(0, Math.floor(bps)));
  return (numerator + 9_999n) / 10_000n;
};

const assertLiveEnabled = (): void => {
  if ((process.env.ZERO_ONE_KILL_SWITCH ?? "false").toLowerCase() === "true") {
    throw new Error("ZERO_ONE_KILL_SWITCH is enabled; live trading is disabled.");
  }
  if ((process.env.ZERO_ONE_LIVE_TRADING ?? "false").toLowerCase() !== "true") {
    throw new Error("Live trading is disabled. Set ZERO_ONE_LIVE_TRADING=true explicitly to enable bounded buys.");
  }
};

export async function executeBoundedBuy(input: LiveBuyInput): Promise<LiveBuyReceipt> {
  assertLiveEnabled();
  if (!Number.isFinite(input.shares) || input.shares <= 0) throw new Error("shares must be positive");
  if (!Number.isFinite(input.probability) || input.probability < 0 || input.probability > 1) throw new Error("probability must be in [0,1]");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) throw new Error("confidence must be in [0,1]");
  if (input.maxSpendTst !== undefined && (!Number.isFinite(input.maxSpendTst) || input.maxSpendTst <= 0)) {
    throw new Error("maxSpendTst must be positive when provided");
  }

  const maxOrderTst = numberEnv("ZERO_ONE_MAX_ORDER_TST", 5);
  const effectiveSpendCap = Math.min(maxOrderTst, input.maxSpendTst ?? maxOrderTst);
  const slippageBps = numberEnv("ZERO_ONE_SLIPPAGE_BPS", 200);
  const maxPriorDrift = numberEnv("ZERO_ONE_HUNT_MAX_PRIOR_DRIFT", 0.08);
  const sharesOut = sharesToBigint(input.shares);
  const method = input.method ?? "bounded-live-buy-v1";
  const beliefCreatedAt = input.beliefCreatedAtMs ?? Date.now();
  const beliefExpiresAt = input.beliefExpiresAtMs ?? beliefCreatedAt + tradePolicy.maxBeliefAgeMs;

  const initialMarket = await delphi.getMarket({ id: input.marketId, pricesAndImpliedProbabilities: true, ...competitionScope });
  if (initialMarket.status !== "open") throw new Error(`Market is ${initialMarket.status}, not open.`);
  const initialPValue = initialMarket.spotImpliedProbabilities?.[input.outcomeIndex];
  if (typeof initialPValue !== "number" || !Number.isFinite(initialPValue)) throw new Error("Fresh market probability unavailable.");
  const initialP = initialPValue;

  const firstQuote = await delphi.quoteBuy({ marketAddress: input.marketId, outcomeIdx: input.outcomeIndex, sharesOut });
  const firstCost = collateralToNumber(firstQuote.tokensIn);
  if (firstCost > effectiveSpendCap) {
    throw new Error(`Quoted cost ${firstCost.toFixed(6)} TST exceeds effective spend cap ${effectiveSpendCap.toFixed(6)} TST.`);
  }
  await delphi.ensureTokenApproval({ marketAddress: input.marketId, minimumAmount: slippageCap(firstQuote.tokensIn, slippageBps) });

  const market = await delphi.getMarket({ id: input.marketId, pricesAndImpliedProbabilities: true, ...competitionScope });
  if (market.status !== "open") throw new Error(`Market changed to ${market.status} before execution.`);
  const marketProbabilityValue = market.spotImpliedProbabilities?.[input.outcomeIndex];
  if (typeof marketProbabilityValue !== "number" || !Number.isFinite(marketProbabilityValue)) {
    throw new Error("Fresh market probability unavailable before execution.");
  }
  const marketProbability = marketProbabilityValue;
  const drift = Math.abs(marketProbability - initialP);
  if (drift > maxPriorDrift) throw new Error(`Market probability drifted ${drift.toFixed(4)} before execution.`);

  const secondQuote = await delphi.quoteBuy({ marketAddress: input.marketId, outcomeIdx: input.outcomeIndex, sharesOut });
  const quotedCost = collateralToNumber(secondQuote.tokensIn);
  if (quotedCost > effectiveSpendCap) {
    throw new Error(`Fresh quoted cost ${quotedCost.toFixed(6)} TST exceeds effective spend cap ${effectiveSpendCap.toFixed(6)} TST.`);
  }
  const quote: QuoteObservation = { shares: input.shares, tokensIn: quotedCost, averagePrice: quotedCost / input.shares, quotedAt: Date.now() };
  const snapshot: MarketSnapshot = {
    marketId: input.marketId,
    question: market.metadata?.question ?? input.marketId,
    outcomes: market.metadata?.outcomes ?? [],
    outcomeIndex: input.outcomeIndex,
    outcome: market.metadata?.outcomes?.[input.outcomeIndex] ?? `#${input.outcomeIndex}`,
    marketProbability,
    observedAt: Date.now(),
  };
  const belief: MarketBelief = {
    marketId: input.marketId,
    outcomeIndex: input.outcomeIndex,
    probability: input.probability,
    confidence: input.confidence,
    createdAt: beliefCreatedAt,
    expiresAt: beliefExpiresAt,
    method,
    rationale: "Bounded live buy from a previously generated forecast.",
    evidence: [],
    invalidationConditions: ["Market probability or quote changes enough to fail deterministic policy."],
  };
  const portfolio: PortfolioState = { accountValue: input.accountValue, marketExposure: input.marketExposure };
  const evaluation = evaluateTrade(snapshot, belief, quote, portfolio, tradePolicy, Date.now());
  if (evaluation.status !== "PROPOSED") throw new Error(`Trade refused: ${evaluation.code} — ${evaluation.reason}`);
  const proposal: TradeProposal = evaluation;

  const maxTokensIn = slippageCap(secondQuote.tokensIn, slippageBps);
  await delphi.ensureTokenApproval({ marketAddress: input.marketId, minimumAmount: maxTokensIn });
  const { transactionHash } = await delphi.buyShares({ marketAddress: input.marketId, outcomeIdx: input.outcomeIndex, sharesOut, maxTokensIn });

  const base = {
    schemaVersion: "0-1.live-buy.v1" as const,
    submittedAtMs: Date.now(),
    marketId: input.marketId,
    outcomeIndex: input.outcomeIndex,
    shares: input.shares,
    ourProbability: input.probability,
    confidence: input.confidence,
    marketProbability,
    quotedCost,
    averageExecutionPrice: proposal.averageExecutionPrice,
    executionEdge: proposal.executionEdge,
    maxTokensInAtomic: maxTokensIn.toString(),
    transactionHash,
    method,
  };
  const receipt: LiveBuyReceipt = { id: sha256Json(base), ...base };
  await appendJsonl(process.env.ZERO_ONE_TRADE_LOG ?? "data/trades.jsonl", receipt);
  return receipt;
}
