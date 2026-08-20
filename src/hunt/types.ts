import type { HexAddress, TradeEvaluation, TradeProposal } from "../domain/types.js";
import type { EvidenceCouncilResult } from "../forecast/evidence/types.js";
import type { MarketRoutingDecision } from "../forecast/types.js";

export interface HunterMarketInput {
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  category: string | null;
  resolvesAt: string | null;
  settlesAt: string | null;
  dataSources: unknown;
  probabilities: number[];
  observedAtMs: number;
}

export interface TriageFeatures {
  resolutionProximity: number;
  marketUncertainty: number;
  resolvability: number;
  sourceSpecificity: number;
  archetypeSupport: number;
  outcomeEfficiency: number;
}

export interface TriageCandidate {
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  probabilities: number[];
  outcomeIndex: number;
  outcome: string;
  marketProbability: number;
  routing: MarketRoutingDecision;
  features: TriageFeatures;
  triageScore: number;
  reasons: string[];
  observedAtMs: number;
}

export type ForecastSource = "EVIDENCE_COUNCIL" | "CRYPTO_TERMINAL_RV";

export interface OpportunityForecast {
  source: ForecastSource;
  marketId: HexAddress;
  outcomeIndex: number;
  probability: number;
  confidence: number;
  marketProbability: number;
  method: string;
  generatedAtMs: number;
  expiresAtMs: number;
  evidenceIds: string[];
  rationale: string;
  disagreement: number;
}

export interface ForecastSide {
  marketId: HexAddress;
  outcomeIndex: number;
  outcome: string;
  probability: number;
  marketProbability: number;
  derivedAsComplement: boolean;
}

export interface SideOpportunityEvaluation {
  side: ForecastSide;
  evaluations: Array<TradeEvaluation | { status: "QUOTE_FAILED"; shares: number; error: string }>;
  bestProposal: TradeProposal | null;
  opportunityScore: number;
}

export type HuntCandidateStatus =
  | "RESEARCH_REFUSED"
  | "PRIOR_DRIFT"
  | "NO_EXECUTABLE_EDGE"
  | "ACTIONABLE"
  | "RESEARCH_FAILED";

export interface HuntCandidateResult {
  candidate: TriageCandidate;
  status: HuntCandidateStatus;
  forecast: OpportunityForecast | null;
  council: EvidenceCouncilResult | null;
  priorDrift: number | null;
  refreshedProbabilities: number[];
  sides: SideOpportunityEvaluation[];
  bestSide: SideOpportunityEvaluation | null;
  reason: string;
  researchPacketPath: string | null;
}

export interface HuntReport {
  schemaVersion: "0-1.hunt-report.v1";
  generatedAtMs: number;
  openMarkets: number;
  triageCandidates: number;
  researchBudget: number;
  researched: number;
  actionable: number;
  results: HuntCandidateResult[];
}
