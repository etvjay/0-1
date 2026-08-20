import { quoteSizes, tradePolicy } from "../config.js";
import type { MarketBelief, MarketSnapshot, PortfolioState, TradeProposal } from "../domain/types.js";
import { evaluateTrade } from "../domain/evaluate.js";
import { quoteLadder } from "../delphi/quotes.js";
import type { ForecastSide, OpportunityForecast, SideOpportunityEvaluation, TriageCandidate } from "./types.js";

export function forecastSides(
  candidate: TriageCandidate,
  forecast: OpportunityForecast,
  refreshedProbabilities: number[],
): ForecastSide[] {
  const refreshedPrimary = refreshedProbabilities[forecast.outcomeIndex];
  const primaryMarketProbability =
    typeof refreshedPrimary === "number" && Number.isFinite(refreshedPrimary)
      ? refreshedPrimary
      : forecast.marketProbability;

  const primary: ForecastSide = {
    marketId: candidate.marketId,
    outcomeIndex: forecast.outcomeIndex,
    outcome: candidate.outcomes[forecast.outcomeIndex] ?? `#${forecast.outcomeIndex}`,
    probability: forecast.probability,
    marketProbability: primaryMarketProbability,
    derivedAsComplement: false,
  };

  if (candidate.outcomes.length !== 2) return [primary];
  const oppositeIndex = forecast.outcomeIndex === 0 ? 1 : 0;
  const oppositeMarketP = refreshedProbabilities[oppositeIndex];
  if (typeof oppositeMarketP !== "number" || !Number.isFinite(oppositeMarketP)) return [primary];

  return [
    primary,
    {
      marketId: candidate.marketId,
      outcomeIndex: oppositeIndex,
      outcome: candidate.outcomes[oppositeIndex] ?? `#${oppositeIndex}`,
      probability: 1 - forecast.probability,
      marketProbability: oppositeMarketP,
      derivedAsComplement: true,
    },
  ];
}

export async function evaluateForecastSide(
  side: ForecastSide,
  forecast: OpportunityForecast,
  accountValue: number,
  marketExposure: number,
): Promise<SideOpportunityEvaluation> {
  const now = Date.now();
  const snapshot: MarketSnapshot = {
    marketId: side.marketId,
    question: "hunter-evaluation",
    outcomes: [],
    outcomeIndex: side.outcomeIndex,
    outcome: side.outcome,
    marketProbability: side.marketProbability,
    observedAt: now,
  };
  const belief: MarketBelief = {
    marketId: side.marketId,
    outcomeIndex: side.outcomeIndex,
    probability: side.probability,
    confidence: forecast.confidence,
    createdAt: forecast.generatedAtMs,
    expiresAt: forecast.expiresAtMs,
    method: forecast.method,
    rationale: forecast.rationale,
    evidence: forecast.evidenceIds.map((id) => ({
      id,
      source: forecast.source.toLowerCase(),
      observedAt: forecast.generatedAtMs,
      freshnessMs: Math.max(0, forecast.expiresAtMs - forecast.generatedAtMs),
      support: "CONTEXT" as const,
    })),
    invalidationConditions: [],
  };
  const portfolio: PortfolioState = { accountValue, marketExposure };
  const ladder = await quoteLadder(side.marketId, side.outcomeIndex, quoteSizes);
  const evaluations = ladder.map((quote) => {
    if ("error" in quote) return { status: "QUOTE_FAILED" as const, shares: quote.shares, error: quote.error };
    return evaluateTrade(snapshot, belief, quote, portfolio, tradePolicy, Date.now());
  });
  const proposals = evaluations.filter((item): item is TradeProposal => item.status === "PROPOSED");
  const bestProposal = proposals.sort((a, b) => b.expectedValue - a.expectedValue)[0] ?? null;
  const opportunityScore = bestProposal
    ? bestProposal.expectedValue * forecast.confidence * (1 - Math.min(1, Math.max(0, forecast.disagreement)))
    : 0;

  return { side, evaluations, bestProposal, opportunityScore };
}
