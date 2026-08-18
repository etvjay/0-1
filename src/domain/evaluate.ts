import type {
  MarketBelief,
  MarketSnapshot,
  PortfolioState,
  QuoteObservation,
  TradeEvaluation,
  TradePolicy,
  TradeRefusal,
} from "./types.js";

const refuse = (code: TradeRefusal["code"], reason: string, now: number): TradeRefusal => ({
  status: "REFUSED",
  code,
  reason,
  evaluatedAt: now,
});

const validProbability = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

export function evaluateTrade(
  snapshot: MarketSnapshot,
  belief: MarketBelief,
  quote: QuoteObservation,
  portfolio: PortfolioState,
  policy: TradePolicy,
  now = Date.now(),
): TradeEvaluation {
  if (
    !validProbability(snapshot.marketProbability) ||
    !validProbability(belief.probability) ||
    !validProbability(belief.confidence) ||
    quote.shares <= 0 ||
    quote.tokensIn <= 0 ||
    portfolio.accountValue <= 0 ||
    portfolio.marketExposure < 0
  ) {
    return refuse("INVALID_INPUT", "Non-finite or out-of-range market, belief, quote, or portfolio input.", now);
  }

  if (belief.marketId !== snapshot.marketId || belief.outcomeIndex !== snapshot.outcomeIndex) {
    return refuse("BELIEF_MISMATCH", "Belief is not bound to this exact market outcome.", now);
  }

  if (now > belief.expiresAt || now - belief.createdAt > policy.maxBeliefAgeMs) {
    return refuse("BELIEF_STALE", "Belief exceeded its expiry or maximum freshness budget.", now);
  }

  if (now - quote.quotedAt > policy.maxQuoteAgeMs) {
    return refuse("QUOTE_STALE", "Execution quote exceeded the permitted freshness budget.", now);
  }

  if (belief.confidence < policy.minConfidence) {
    return refuse("LOW_CONFIDENCE", `Confidence ${belief.confidence.toFixed(4)} is below policy floor ${policy.minConfidence.toFixed(4)}.`, now);
  }

  const averageExecutionPrice = quote.tokensIn / quote.shares;
  const spotEdge = belief.probability - snapshot.marketProbability;
  const executionEdge = belief.probability - averageExecutionPrice;
  const expectedValue = executionEdge * quote.shares;
  const priceImpact = averageExecutionPrice - snapshot.marketProbability;

  if (executionEdge < policy.minExecutionEdge) {
    return refuse(
      "NO_EDGE",
      `Execution edge ${executionEdge.toFixed(4)} is below policy floor ${policy.minExecutionEdge.toFixed(4)} after quoted LMSR impact.`,
      now,
    );
  }

  if (priceImpact > policy.maxPriceImpact) {
    return refuse(
      "PRICE_IMPACT",
      `Quoted average price impact ${priceImpact.toFixed(4)} exceeds policy ceiling ${policy.maxPriceImpact.toFixed(4)}.`,
      now,
    );
  }

  const postTradeMarketExposure = portfolio.marketExposure + quote.tokensIn;
  const maxExposure = portfolio.accountValue * policy.maxPositionFraction;
  if (postTradeMarketExposure > maxExposure) {
    return refuse(
      "EXPOSURE_LIMIT",
      `Post-trade market exposure ${postTradeMarketExposure.toFixed(4)} exceeds limit ${maxExposure.toFixed(4)}.`,
      now,
    );
  }

  return {
    status: "PROPOSED",
    marketId: snapshot.marketId,
    outcomeIndex: snapshot.outcomeIndex,
    shares: quote.shares,
    quotedCost: quote.tokensIn,
    averageExecutionPrice,
    marketProbability: snapshot.marketProbability,
    ourProbability: belief.probability,
    spotEdge,
    executionEdge,
    expectedValue,
    priceImpact,
    postTradeMarketExposure,
    beliefCreatedAt: belief.createdAt,
    quoteCreatedAt: quote.quotedAt,
    evaluatedAt: now,
  };
}
