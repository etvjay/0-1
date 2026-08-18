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

export