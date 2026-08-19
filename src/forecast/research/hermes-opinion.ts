import { sha256Json } from "../../history/io.js";
import type { ForecastOpinion } from "../evidence/types.js";
import { HermesClient, parseHermesJson } from "./hermes-client.js";
import type { OpinionProvider, OpinionRequest } from "./types.js";

interface StructuredOpinion {
  probability: number;
  confidence: number;
  evidence_ids: string[];
  assumptions: string[];
  rationale: string;
}

const validate = (value: StructuredOpinion, allowedEvidence: Set<string>): StructuredOpinion => {
  if (!Number.isFinite(value.probability) || value.probability < 0 || value.probability > 1) {
    throw new Error("Hermes opinion probability invalid");
  }
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    throw new Error("Hermes opinion confidence invalid");
  }
  if (!Array.isArray(value.evidence_ids) || !Array.isArray(value.assumptions) || typeof value.rationale !== "string") {
    throw new Error("Hermes opinion JSON shape invalid");
  }
  const evidence_ids = [...new Set(value.evidence_ids)].filter((id) => allowedEvidence.has(id));
  if (evidence_ids.length === 0) throw new Error("Hermes opinion cited no valid evidence IDs");
  return { ...value, evidence_ids };
};

export class HermesOpinionProvider implements OpinionProvider {
  readonly name = "hermes-opinion-v2";
  private readonly client = new HermesClient();

  async forecast(request: OpinionRequest): Promise<ForecastOpinion> {
    const roleInstruction = request.role === "OPPOSE"
      ? "Build the strongest evidence-bounded case AGAINST the selected outcome. Do not manufacture contradictions."
      : "Estimate the selected outcome from the evidence while preserving uncertainty.";

    const system = [
      "You are 0-1's bounded prediction-market forecaster.",
      roleInstruction,
      "This is an evidence-only reasoning step.",
      "Do not call web_search, web_extract, browser, terminal, file, code execution, skills, memory, delegation, cron, image, or any other tool.",
      "Use only the supplied evidence; do not execute trades or make capital decisions.",
      "Return immediately with only JSON containing probability, confidence, evidence_ids, assumptions, rationale.",
      "probability/confidence are numbers in [0,1]. evidence_ids must only cite supplied IDs.",
    ].join(" ");

    const user = JSON.stringify({
      question: request.routing.resolution.question,
      outcomes: request.routing.resolution.outcomes,
      selectedOutcomeIndex: request.outcomeIndex,
      selectedOutcome: request.outcomeLabel,
      marketProbability: request.marketProbability,
      resolution: request.routing.resolution,
      classification: request.routing.classification,
      evidence: request.evidence.map((item) => ({
        id: item.id,
        source: item.source,
        sourceType: item.sourceType,
        reliability: item.reliability,
        observedAtMs: item.observedAtMs,
        summary: item.summary,
        value: item.value,
      })),
    });

    const parsed = validate(
      parseHermesJson<StructuredOpinion>(await this.client.chat(system, user)),
      new Set(request.evidence.map((item) => item.id)),
    );

    const relevantExpiries = request.evidence
      .filter((item) => parsed.evidence_ids.includes(item.id) && item.expiresAtMs !== null)
      .map((item) => item.expiresAtMs as number);
    const expiresAtMs = Math.min(request.nowMs + 30 * 60 * 1000, ...relevantExpiries);

    const base = {
      marketId: request.routing.resolution.marketId,
      outcomeIndex: request.outcomeIndex,
      role: request.role,
      probability: parsed.probability,
      confidence: parsed.confidence,
      method: this.name,
      methodVersion: process.env.HERMES_MODEL ?? "hermes-agent",
      generatedAtMs: request.nowMs,
      expiresAtMs,
      evidenceIds: parsed.evidence_ids,
      assumptions: parsed.assumptions,
      rationale: parsed.rationale,
    };

    return { id: sha256Json(base), ...base };
  }
}
