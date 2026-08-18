export type CryptoDirection = "ABOVE" | "BELOW";

export interface CryptoThresholdSpec {
  asset: string;
  symbol: string;
  threshold: number;
  direction: CryptoDirection;
  resolvesAtMs: number;
  trueOutcomeIndex: number;
  falseOutcomeIndex: number | null;
  parserConfidence: number;
}

export interface ReferencePrice {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  observedAtMs: number;
}

export interface VolatilityEstimate {
  annualized: number;
  shortAnnualized: number;
  longAnnualized: number;
  samples: number;
  intervalMinutes: number;
}

export interface CryptoForecastInput {
  spot: number;
  threshold: number;
  direction: CryptoDirection;
  annualizedVolatility: number;
  horizonYears: number;
}

export interface CryptoForecastResult {
  probability: number;
  probabilityAbove: number;
  distanceLog: number;
  sigmaHorizon: number;
  method: "gbm-zero-drift-rv-v1";
}

export interface CryptoMarketForecast {
  spec: CryptoThresholdSpec;
  referencePrice: ReferencePrice;
  volatility: VolatilityEstimate;
  probability: number;
  confidence: number;
  marketProbability: number;
  spotEdge: number;
  generatedAtMs: number;
  method: "gbm-zero-drift-rv-v1";
  rationale: string;
}
