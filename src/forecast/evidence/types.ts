import type { HexAddress } from "../../domain/types.js";
import type { ForecastEvidence, MarketRoutingDecision } from "../types.js";

export type EvidenceStance = "SUPPORTS" | "CONTRADICTS" | "CONTEXT";
export type OpinionRole = "BASE" | "ADVOCATE" | "OPPOSE" | "SPECIALIST";

export interface EvidenceItem extends ForecastEvidence {
  stance: EvidenceStance;
  reliability: number;
  independenceGroup: string;
  summary: string;
}

export interface ForecastOpinion {
  id: string;
  marketId: HexAddress;
  outcomeIndex: number;
  role: OpinionRole;
  probability: number;
  confidence: number;
  method: string;
  methodVersion: string;
  generatedAtMs: number;
  expiresAtMs: number;
  evidenceIds: string[];
  assumptions: string[];
  rationale: string;
}

export interface EvidenceForecastBundle {
  schemaVersion: "0-1.evidence-bundle.v1";
  generatedAtMs: number;
  routing: MarketRoutingDecision;
  marketProbability: number;
  outcomeIndex: number;
  evidence: EvidenceItem[];
  opinions: ForecastOpinion[];
}

export type EvidenceCouncilRefusalCode =
  | "INVALID_BUNDLE"
  | "NO_VALID_OPINIONS"
  | "STALE_OPINIONS"
  | "MISSING_EVIDENCE"
  | "MISSING_ROLES"
  | "EXCESSIVE_DISAGREEMENT"
  | "AMBIGUOUS_RESOLUTION";

export interface EvidenceCouncilRefusal {
  status: "REFUSED";
  code: EvidenceCouncilRefusalCode;
  reason: string;
  evaluatedAtMs: number;
}

export interface EvidenceCouncilForecast {
  status: "FORECAST";
  marketId: HexAddress;
  outcomeIndex: number;
  probability: number;
  confidence: number;
  marketProbability: number;
  method: "evidence-council-v1";
  generatedAtMs: number;
  expiresAtMs: number;
  validOpinionIds: string[];
  evidenceIds: string[];
  assumptions: string[];
  contradictions: string[];
  disagreement: number;
  effectiveIndependentSources: number;
  rationale: string;
}

export type EvidenceCouncilResult = EvidenceCouncilForecast | EvidenceCouncilRefusal;

export interface EvidenceCouncilPolicy {
  minOpinionConfidence: number;
  maxOpinionAgeMs: number;
  maxDisagreement: number;
  minIndependentSources: number;
  requiredOpinionRoles: OpinionRole[];
  maxResolutionAmbiguities: number;
  marketPriorWeight: number;
  opposeWeightMultiplier: number;
}
