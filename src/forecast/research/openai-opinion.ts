import { sha256Json } from "../../history/io.js";
import type { ForecastOpinion } from "../evidence/types.js";
import type { OpinionProvider, OpinionRequest } from "./types.js";

interface StructuredOpinion {
  probability: number;
  confidence: number;
  evidence_ids: string[];
  assumptions: string[];
  rationale: string;
}

interface ResponsesPayload {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  output_text?: string;
}

const extractText = (payload: ResponsesPayload): string => {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("OpenAI response contained no output_text");
};

const validate = (value: StructuredOpinion, allowedEvidence: Set<string>): StructuredOpinion => {
  if (!Number.isFinite(value.probability) || value.probability < 0 || value.probability > 1) throw new Error("Opinion probability invalid");
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) throw new Error("Opinion confidence invalid");
  const evidence_ids = [...new Set(value.evidence_ids)].filter((id) => allowedEvidence.has(id));
  if (evidence_ids.length === 0) throw new Error("Opinion cited no valid evidence IDs");
  return { ...value, evidence_ids };
};

export class OpenAIOpinionProvider implements OpinionProvider {
  readonly name = "openai-structured-opinion-v1";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    apiKey = process.env.OPENAI_API_KEY ?? "",
    model = process.env.ZERO_ONE_RESEARCH_MODEL ?? "gpt-5.6",
  ) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is required for autonomous research opinions");
    this.apiKey = apiKey;
    this.model = model;
  }

  async forecast(request: OpinionRequest): Promise<ForecastOpinion> {
    const roleInstruction = request.role === "OPPOSE"
      ? "Build the strongest evidence-bounded case AGAINST the selected outcome. Do not manufacture contradictions."
      : "Estimate the selected outcome from the evidence. Seek the strongest supported case while preserving uncertainty.";

    const evidence = request.evidence.map((item) => ({
      id: item.id,
      source: item.source,
      sourceType: item.sourceType,
      reliability: item.reliability,
      observedAtMs: item.observedAtMs,
      summary: item.summary,
      value: item.value,
    }));

    const prompt = [
      "You are a calibrated prediction-market forecaster.",
      roleInstruction,
      "Use only the supplied evidence. Market probability is context, not truth.",
      "Treat source duplication, stale evidence, resolution ambiguity, and weak base rates as uncertainty.",
      "Return a probability for the selected outcome, not a trading decision.",
      JSON.stringify({
        question: request.routing.resolution.question,
        outcomes: request.routing.resolution.outcomes,
        selectedOutcomeIndex: request.outcomeIndex,
        selectedOutcome: request.outcomeLabel,
        marketProbability: request.marketProbability,
        resolution: request.routing.resolution,
        classification: request.routing.classification,
        evidence,
      }),
    ].join("\n\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "forecast_opinion",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                probability: { type: "number", minimum: 0, maximum: 1 },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                evidence_ids: { type: "array", items: { type: "string" }, minItems: 1 },
                assumptions: { type: "array", items: { type: "string" } },
                rationale: { type: "string" },
              },
              required: ["probability", "confidence", "evidence_ids", "assumptions", "rationale"],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`OpenAI opinion failed: ${response.status} ${await response.text()}`);

    const raw = await response.json() as ResponsesPayload;
    const parsed = validate(JSON.parse(extractText(raw)) as StructuredOpinion, new Set(request.evidence.map((item) => item.id)));
    const expiresAtMs = Math.min(
      request.nowMs + 30 * 60 * 1000,
      ...request.evidence
        .filter((item) => parsed.evidence_ids.includes(item.id) && item.expiresAtMs !== null)
        .map((item) => item.expiresAtMs as number),
    );
    const base = {
      marketId: request.routing.resolution.marketId,
      outcomeIndex: request.outcomeIndex,
      role: request.role,
      probability: parsed.probability,
      confidence: parsed.confidence,
      method: this.name,
      methodVersion: this.model,
      generatedAtMs: request.nowMs,
      expiresAtMs,
      evidenceIds: parsed.evidence_ids,
      assumptions: parsed.assumptions,
      rationale: parsed.rationale,
    };
    return { id: sha256Json(base), ...base };
  }
}
