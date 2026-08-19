import { sha256Json } from "../../history/io.js";
import type { EvidenceItem, ForecastOpinion } from "../evidence/types.js";
import { HermesClient, parseHermesJson } from "./hermes-client.js";
import type { OpinionProvider, OpinionRequest } from "./types.js";

interface StructuredOpinion {
  probability: number;
  confidence: number;
  evidence_ids: string[];
  assumptions: string[];
  rationale: