import type { HexAddress } from "../domain/types.js";

export type MarketDomain =
  | "CRYPTO"
  | "CULTURE"
  | "ECONOMICS"
  | "POLITICS"
  | "SPORTS"
  | "MISCELLANEOUS";

export type MarketArchetype =
  | "TERMINAL_THRESHOLD"
  | "PATH_DEPENDENT_THRESHOLD"
  | "SCHEDULED_ANNOUNCEMENT"
  | "SPORTS_EVENT"
  | "ELECTION_OR_POLL"
  | "MACRO_RELEASE"
  | "PRODUCT_OR_CULTURE_EVENT"
  | "GENERIC_BINARY_EVENT";

export interface ResolutionSpec {
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  closesAtMs: number | null;
  resolvesAtMs: number | null;
  settlesAtMs: number | null;
  acceptableDataSources: string[];
  ambiguities: string[];
  invalidationConditions: string[];
}

export interface MarketClassification {
  domain: MarketDomain;
  archetype: MarketArchetype;
  confidence: number;
  specialists: string[];
  reasons: string[];
}

export interface ForecastEvidence {
  id: string;
  source: string;
  sourceType: "PRIMARY" | "MARKET" | "DATA_FEED" | "NEWS" | "MODEL" | "DERIVED";
  observedAtMs: number;
  expiresAtMs: number | null;
  supports: string;
  value: unknown;
}

export interface DomainForecast {
  marketId: HexAddress;
  outcomeIndex: number;
  probability: number;
  confidence: number;
  method: string;
  methodVersion: string;
  generatedAtMs: number;
  expiresAtMs: number;
  evidence: ForecastEvidence[];
  assumptions: string[];
  contradictions: string[];
  invalidationConditions: string[];
  rationale: string;
}

export interface MarketRoutingDecision {
  resolution: ResolutionSpec;
  classification: MarketClassification;
}
