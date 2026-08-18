import type { HexAddress } from "../domain/types.js";

export type HistoricalTradeSide = "BUY" | "SELL";

export interface HistoricalTrade {
  schemaVersion: "0-1.history.trade.v1";
  id: string;
  side: HistoricalTradeSide;
  marketId: HexAddress;
  actor: HexAddress | null;
  outcomeIndex: number;
  sharesAtomic: string;
  tokensAtomic: string;
  shares: number;
  tokens: number;
  averageExecutionPrice: number;
  timestampMs: number;
  blockNumber: number;
  transactionHash: string;
}

export interface MarketResolution {
  schemaVersion: "0-1.history.resolution.v1";
  id: string;
  marketId: HexAddress;
  status: "SETTLED" | "FAILED";
  winningOutcomeIndex: number | null;
  timestampMs: number;
  blockNumber: number;
  transactionHash: string;
}

export interface MarketCatalogRecord {
  schemaVersion: "0-1.history.market.v1";
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  category: string | null;
  currentStatus: string;
  createdAtMs: number;
  settledAtMs: number | null;
}

export interface SubgraphCheckpoint {
  blockNumber: number;
  blockTimestamp: number | null;
  blockHash: string | null;
  deployment: string;
  hasIndexingErrors: boolean;
}

export interface CompetitionHistorySnapshot {
  schemaVersion: "0-1.history.snapshot.v1";
  competitionId: string | null;
  generatedAtMs: number;
  subgraph: SubgraphCheckpoint;
  markets: MarketCatalogRecord[];
  trades: HistoricalTrade[];
  resolutions: MarketResolution[];
}

export interface ReplayMarket {
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  category: string | null;
  createdAtMs: number;
}

export interface ReplayView {
  cutoffMs: number;
  market: ReplayMarket;
  trades: HistoricalTrade[];
  resolution: MarketResolution | null;
}

export interface RecordedMarketSnapshot {
  schemaVersion: "0-1.market-observation.v1";
  observedAtMs: number;
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  probabilities: number[];
  status: string;
}

export interface ForecastRecord {
  schemaVersion: "0-1.forecast.v1";
  id: string;
  marketId: HexAddress;
  outcomeIndex: number;
  probability: number;
  confidence: number;
  marketProbability: number;
  method: string;
  createdAtMs: number;
}

export interface ForecastScore {
  forecastId: string;
  marketId: HexAddress;
  outcomeIndex: number;
  resolvedOutcomeIndex: number;
  probability: number;
  marketProbability: number;
  observedOutcome: 0 | 1;
  brier: number;
  marketBrier: number;
  brierSkillVsMarket: number;
  logLoss: number;
  marketLogLoss: number;
  logLossSkillVsMarket: number;
}

export interface ForecastScoreSummary {
  resolvedForecasts: number;
  meanBrier: number | null;
  meanMarketBrier: number | null;
  meanBrierSkillVsMarket: number | null;
  meanLogLoss: number | null;
  meanMarketLogLoss: number | null;
  meanLogLossSkillVsMarket: number | null;
  scores: ForecastScore[];
}
