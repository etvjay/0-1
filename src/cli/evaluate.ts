import { quoteSizes, tradePolicy } from "../config.js";
import type { MarketBelief, MarketSnapshot, PortfolioState } from "../domain/types.js";
import { evaluateTrade } from "../domain/evaluate.js";
import { competitionScope, delphi } from "../delphi/client.js";
import { quoteLadder } from "../delphi/quotes.js";

const [, , marketArg, outcomeArg, probabilityArg, confidenceArg, accountValueArg = "100", exposureArg = "0"] = process.argv;

if (!marketArg || outcomeArg === undefined || probabilityArg === undefined || confidenceArg === undefined) {
  console.error("Usage: npm run evaluate -- <market> <outcome-index> <our-probability> <confidence> [account-value] [market-exposure]");
  process.exit(1);
}

const marketId = marketArg as `0x${string}`;
const outcomeIndex = Number(outcomeArg);
const ourProbability = Number(probabilityArg);
const confidence = Number(confidenceArg);
const accountValue = Number(accountValueArg);
const marketExposure = Number(exposureArg);

if (![outcomeIndex, ourProbability, confidence, accountValue, marketExposure].every(Number.isFinite)) {
  throw new Error("Numeric arguments contain a non-finite value");
}

const market = await delphi.getMarket({
  id: marketId,
  pricesAndImpliedProbabilities: true,
  ...competitionScope,
});

const outcomes: string[] = market.metadata?.outcomes ?? [];
const probabilities: number[] = market.spotImpliedProbabilities ?? [];
const marketProbability = probabilities[outcomeIndex];
if (marketProbability === undefined) throw new Error(`Outcome ${outcomeIndex} has no live implied probability`);

const now = Date.now();
const snapshot: MarketSnapshot = {
  marketId,
  question: market.metadata?.question ?? marketId,
  outcomes,
  outcomeIndex,
  outcome: outcomes[outcomeIndex] ?? `#${outcomeIndex}`,
  marketProbability,
  observedAt: now,
};

const belief: MarketBelief = {
  marketId,
  outcomeIndex,
  probability: ourProbability,
  confidence,
  createdAt: now,
  expiresAt: now + tradePolicy.maxBeliefAgeMs,
  method: "manual-v0",
  rationale: "Operator-supplied probability for read-only competition evaluation.",
  evidence: [],
  invalidationConditions: [],
};

const portfolio: PortfolioState = { accountValue, marketExposure };
const ladder = await quoteLadder(marketId, outcomeIndex, quoteSizes);

const evaluations = ladder.map((item) => {
  if ("error" in item) return { shares: item.shares, status: "QUOTE_FAILED", error: item.error };
  return evaluateTrade(snapshot, belief, item, portfolio, tradePolicy, Date.now());
});

console.log(JSON.stringify({
  snapshot,
  belief,
  portfolio,
  policy: tradePolicy,
  evaluations,
}, null, 2));
