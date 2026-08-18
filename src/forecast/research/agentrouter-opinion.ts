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

interface ChatCompletionPayload {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

const extractText = (payload: ChatCompletionPayload): string => {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content.map((item) => item.text ?? "").join("\n").trim();
    if (text) return text;
  }
  throw new Error("AgentRouter response contained no assistant content");
};

const parseJson = (text: string): StructuredOpinion => {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unfenced) as StructuredOpinion;
};

const validate = (value: StructuredOpinion, allowedEvidence: Set<string>): StructuredOpinion => {
  if (!Number.isFinite(value.probability) || value.probability < 0 || value.probability > 1) throw new Error("Opinion probability invalid");
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) throw new Error("Opinion confidence invalid");
  if (!Array.isArray(value.evidence_ids) || !Array.isArray(value.assumptions) || typeof value.rationale !== "string") {
    throw new Error("Opinion JSON shape invalid");
  }
  const evidence_ids = [...new Set(value.evidence_ids)].filter((id) => allowedEvidence.has(id));
  if (evidence_ids.length === 0) throw new Error("Opinion cited no valid evidence IDs");
  return { ...value, evidence_ids };
};

export class AgentRouterOpinionProvider implements OpinionProvider {
  readonly name = "agentrouter-opinion-v1";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(
    apiKey = process.env.AGENTROUTER_API_KEY ?? "",
    model = process.env.ZERO_ONE_AGENTROUTER_MODEL ?? process.env.ZERO_ONE_RESEARCH_MODEL ?? "gpt-5.5",
    baseUrl = process.env.AGENTROUTER_BASE_URL ?? "https://co.agentrouter.org/v1",
  ) {
    if (!apiKey) throw new Error("AGENTROUTER_API_KEY is required when ZERO_ONE_OPINION_PROVIDER=agentrouter");
    if (!model) throw new Error("ZERO_ONE_AGENTROUTER_MODEL must name a model available to your AgentRouter key");
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
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

    const system = [
      "You are a calibrated prediction-market forecaster.",
      roleInstruction,
      "Use only supplied evidence. Market probability is context, not truth.",
      "Treat duplicated sources, stale evidence, resolution ambiguity, and weak base rates as uncertainty.",
      "Return only one JSON object with keys probability, confidence, evidence_ids, assumptions, rationale.",
      "probability and confidence must be numbers in [0,1]. evidence_ids must only contain supplied evidence IDs.",
      "Do not return markdown or a trading decision.",
    ].join(" ");

    const user = JSON.stringify({
      question: request.routing.resolution.question,
      outcomes: request.routing.resolution.outcomes,
      selectedOutcomeIndex: request.outcomeIndex,
      selectedOutcome: request.outcomeLabel,
      marketProbability: request.marketProbability,
      resolution: request.routing.resolution,
      classification: request.routing.classification,
      evidence,
    });

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`AgentRouter opinion failed: ${response.status} ${await response.text()}`);

    const raw = await response.json() as ChatCompletionPayload;
    const parsed = validate(parseJson(extractText(raw)), new Set(request.evidence.map((item) => item.id)));
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
