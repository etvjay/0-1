import type { MarketRoutingDecision } from "../types.js";
import type { EvidenceForecastBundle, EvidenceItem, ForecastOpinion, OpinionRole } from "../evidence/types.js";

export type ResearchQueryIntent = "PRIMARY" | "CORROBORATE" | "OPPOSE" | "BASE_RATE";

export interface ResearchQuery {
  id: string;
  intent: ResearchQueryIntent;
  query: string;
  includeDomains: string[];
  maxResults: number;
}

export interface ResearchPlan {
  schemaVersion: "0-1.research-plan.v1";
  generatedAtMs: number;
  marketId: `0x${string}`;
  outcomeIndex: number;
  queries: ResearchQuery[];
}

export interface SearchResultRecord {
  schemaVersion: "0-1.search-result.v1";
  id: string;
  queryId: string;
  queryIntent: ResearchQueryIntent;
  provider: string;
  title: string;
  url: string;
  content: string;
  score: number | null;
  publishedAtMs: number | null;
  observedAtMs: number;
}

export interface SearchRequest {
  query: ResearchQuery;
}

export interface SearchProvider {
  readonly name: string;
  search(request: SearchRequest): Promise<SearchResultRecord[]>;
}

export interface SearchFailureDiagnostic {
  queryId: string;
  intent: ResearchQueryIntent;
  query: string;
  provider: string;
  error: string;
}

export interface OpinionRequest {
  routing: MarketRoutingDecision;
  outcomeIndex: number;
  outcomeLabel: string;
  marketProbability: number;
  role: Extract<OpinionRole, "ADVOCATE" | "OPPOSE">;
  evidence: EvidenceItem[];
  nowMs: number;
}

export interface OpinionProvider {
  readonly name: string;
  forecast(request: OpinionRequest): Promise<ForecastOpinion>;
}

export interface OpinionFailureDiagnostic {
  role: Extract<OpinionRole, "ADVOCATE" | "OPPOSE">;
  provider: string;
  error: string;
}

export interface ResearchPacket {
  schemaVersion: "0-1.research-packet.v1";
  generatedAtMs: number;
  routing: MarketRoutingDecision;
  outcomeIndex: number;
  marketProbability: number;
  plan: ResearchPlan;
  searchResults: SearchResultRecord[];
  searchFailures: SearchFailureDiagnostic[];
  evidence: EvidenceItem[];
  opinionFailures: OpinionFailureDiagnostic[];
}

export interface AutonomousResearchResult {
  packet: ResearchPacket;
  bundle: EvidenceForecastBundle;
}
