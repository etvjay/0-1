import type { MarketBelief, MarketSnapshot, PortfolioState, QuoteObservation, TradeProposal } from "../domain/types.js";
import { evaluateTrade } from "../domain/evaluate.js";
import type { EvidenceCouncilForecast } from "../forecast/evidence/types.js";
import type { ForecastSide, SideOpportunityEvaluation, TriageCandidate } from "./types.js";

export interface QuoteSet {
  outcomeIndex: number;
  quotes: Array<QuoteObservation | { shares: number; error: string }>;
}

export function forecastSides(
  candidate: TriageCandidate,
  council: EvidenceCouncilForecast,
  refreshedProbabilities: number[],
): ForecastSide[] {
  const primaryMarketProbability = refreshedProbabilities[candidate.outcomeIndex];
  if (primaryMarketProbability === undefined) return [];
  const sides: ForecastSide[] = [{
    marketId: candidate.marketId,
    outcomeIndex: candidate.outcomeIndex,
    outcome: candidate.outcomes[candidate.outcomeIndex] ?? `#${candidate.outcomeIndex}`,
    probability: council.probability,
    marketProbability: primaryMarketProbability,
    derivedAsComplement: false,
  }];
  if (candidate.outcomes.length === 2) {
    const complementIndex = candidate.outcomeIndex === 0 ? 1 : 0;
    const complementMarketProbability = refreshedProbabilities[complementIndex];
    if (complementMarketProbability !== undefined) {
      sides.push({
        marketId: candidate.marketId,
        outcomeIndex: complementIndex,
        outcome: candidate.outcomes[complementIndex] ?? `#${complementIndex}`,
        probability: 1 - council.probability,
        marketProbability: complementMarketProbability,
        derivedAsComplement: true,
      });
    }
  }
  return sides;
}

function scoreProposal(
  proposal: TradeProposal,
  confidence: number,
  disagreement: number,
  triageScore: number,
): number {
  const agreement = Math.max(0, 1 - disagreement / 0.22);
  const capitalEfficiency = Math.max(0, Math.min(2, proposal.expectedValue / Math.max(proposal.quotedCost, 1e-9)));
  return proposal.expectedValue * confidence * agreement * (0.5 + triageScore * 0.5) * (0.5 + capitalEfficiency * 0.5);
}

export function evaluateForecastSide(
  candidate: TriageCandidate,
  side: ForecastSide,
  quotes: QuoteSet,
  council: EvidenceCouncilForecast,
  portfolio: PortfolioState,
  tradePolicy: Parameters<typeof evaluateTrade>[4],
  nowMs = Date.now(),
): SideOpportunityEvaluation {
  const snapshot: MarketSnapshot = {
    marketId: side.marketId,
    question: candidate.question,
    outcomes: candidate.outcomes,
    outcomeIndex: side.outcomeIndex,
    outcome: side.outcome,
    marketProbability: side.marketProbability,
    observedAt: nowMs,
  };
  const belief: MarketBelief = {
    marketId: side.marketId,
    outcomeIndex: side.outcomeIndex,
    probability: side.probability,
    confidence: council.confidence,
    createdAt: council.generatedAtMs,
    expiresAt: council.expiresAtMs,
    method: `${council.method}${side.derivedAsComplement ? ":binary-complement" : ""}`,
    rationale: council.rationale,
    evidence: council.evidenceIds.map((id) => ({
      id,
      source: "evidence-council",
      observedAt: council.generatedAtMs,
      freshnessMs: Math.max(0, nowMs - council.generatedAtMs),
      support: "CONTEXT" as const,
    })),
    invalidationConditions: candidate.routing.resolution.invalidationConditions,
  };

  const evaluations = quotes.quotes.map((quote) => {
    if ("error" in quote) return { status: "QUOTE_FAILED" as const, shares: quote.shares, error: quote.error };
    return evaluateTrade(snapshot, belief, quote, portfolio, tradePolicy, nowMs);
  });
  const proposals = evaluations.filter((value): value is TradeProposal => value.status === "PROPOSED");
  let bestProposal: TradeProposal | null = null;
  let opportunityScore = 0;
  for (const proposal of proposals) {
    const score = scoreProposal(proposal, council.confidence, council.disagreement, candidate.triageScore);
    if (bestProposal === null || score > opportunityScore) {
      bestProposal = proposal;
      opportunityScore = score;
    }
  }
  return { side, evaluations, bestProposal, opportunityScore };
}
