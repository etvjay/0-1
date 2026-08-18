export type HexAddress = `0x${string}`;

export interface MarketSnapshot {
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  outcomeIndex: number;
  outcome: string;
  marketProbability: number;
  observedAt: number;
}

export interface EvidenceRef {
  id: string;
  source: string;
  observedAt: number;
  freshnessMs: number;
  support: "SUPPORTS" | "CONTRADICTS" | "CONTEXT";
}

export interface MarketBelief {
  marketId: HexAddress;
  outcomeIndex: number;
  probability: number;
  confidence: number;
  createdAt: number;
  expiresAt: number;
  method: string;
  rationale: string;
  evidence: EvidenceRef[];
  invalidationConditions: string[];
}

export interface QuoteObservation {
  shares: number;
  tokensIn: number;
  averagePrice: number;
  quotedAt: number;
}

export interface PortfolioState {
  accountValue: number;
  marketExposure: number;
}

export interface TradePolicy {
  minConfidence: number;
  minExecutionEdge: number;
  maxQuoteAgeMs: number;
  maxBeliefAgeMs: number;
  maxPositionFraction: number;
  maxPriceImpact: number;
}

export type RefusalCode =
  | "BELIEF_MISMATCH"
  | "BELIEF_STALE"
  | "QUOTE_STALE"
  | "LOW_CONFIDENCE"
  | "NO_EDGE"
  | "PRICE_IMPACT"
  | "EXPOSURE_LIMIT"
  | "INVALID_INPUT";

export interface TradeRefusal {
  status: "REFUSED";
  code: RefusalCode;
  reason: string;
  evaluatedAt: number;
}

export interface TradeProposal {
  status: "PROPOSED";
  marketId: HexAddress;
  outcomeIndex: number;
  shares: number;
  quotedCost: number;
  averageExecutionPrice: number;
  marketProbability: number;
  ourProbability: number;
  spotEdge: number;
  executionEdge: number;
  expectedValue: number;
  priceImpact: number;
  postTradeMarketExposure: number;
  beliefCreatedAt: number;
  quoteCreatedAt: number;
  evaluatedAt: number;
}

export type TradeEvaluation = TradeProposal | TradeRefusal;
