import { sha256Json } from "../../history/io.js";
import type { EvidenceItem, ForecastOpinion } from "../evidence/types.js";
import { HermesClient, parseHermesJson } from "./hermes-client.js";
import type { OpinionProvider, OpinionRequest } from "./types.js";

interface StructuredOpinion {
  probability: number;
  confidence: number;
  evidence_ids: string[];
  assumptions: string[];
  rationale: string;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Hermes opinion JSON shape invalid");
  }
  return value as UnknownRecord;
};

const assumptionText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    try {
      const text = JSON.stringify(value);
      return text && text !== "{}" && text !== "[]" ? text : null;
    } catch {
      return null;
    }
  }
  return null;
};

const normalizeAssumptions = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(assumptionText).filter((item): item is string => item !== null))];
};

const normalizeStructuredOpinion = (value: unknown): StructuredOpinion => {
  const record = asRecord(value);
  const probability = record.probability;
  const confidence = record.confidence;
  const evidenceIds = record.evidence_ids ?? record.evidenceIds;
  const assumptions = normalizeAssumptions(record.assumptions);
  const rationale = record.rationale ?? record.reasoning;

  if (typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("Hermes opinion probability invalid");
  }
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Hermes opinion confidence invalid");
  }
  if (!Array.isArray(evidenceIds) || !evidenceIds.every((id) => typeof id === "string")) {
    throw new Error("Hermes opinion evidence IDs invalid");
  }
  if (typeof rationale !== "string" || !rationale.trim()) {
    throw new Error("Hermes opinion rationale invalid");
  }

  return {
    probability,
    confidence,
    evidence_ids: evidenceIds,
    assumptions,
    rationale: rationale.trim(),
  };
};

const validate = (value: StructuredOpinion, allowedEvidence: Set<string>): StructuredOpinion => {
  const evidence_ids = [...new Set(value.evidence_ids)].filter((id) => allowedEvidence.has(id));
  if (evidence_ids.length === 0) throw new Error("Hermes opinion cited no valid evidence IDs");
  return { ...value, evidence_ids };
};

const evidenceRank = (item: EvidenceItem): number => {
  const sourceBonus = item.sourceType === "PRIMARY" || item.sourceType === "DATA_FEED" ? 0.15 : 0;
  return item.reliability + sourceBonus;
};

const selectEvidence = (items: EvidenceItem[], maxItems = 8): EvidenceItem[] => {
  const ranked = [...items].sort((a, b) => evidenceRank(b) - evidenceRank(a));
  const selected: EvidenceItem[] = [];
  const selectedIds = new Set<string>();
  const groups = new Set<string>();

  for (const item of ranked) {
    if (selected.length >= maxItems) break;
    if (groups.has(item.independenceGroup)) continue;
    groups.add(item.independenceGroup);
    selectedIds.add(item.id);
    selected.push(item);
  }

  for (const item of ranked) {
    if (selected.length >= maxItems) break;
    if (selectedIds.has(item.id)) continue;
    selectedIds.add(item.id);
    selected.push(item);
  }

  return selected;
};

const compactValue = (value: unknown): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as UnknownRecord;
  return {
    title: typeof record.title === "string" ? record.title.slice(0, 240) : undefined,
    content: typeof record.content === "string" ? record.content.slice(0, 900) : undefined,
    queryIntent: typeof record.queryIntent === "string" ? record.queryIntent : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
  };
};

export class HermesOpinionProvider implements OpinionProvider {
  readonly name = "hermes-opinion-v4";
  private readonly client = new HermesClient();

  async forecast(request: OpinionRequest): Promise<ForecastOpinion> {
    const roleInstruction = request.role === "OPPOSE"
      ? "Build the strongest evidence-bounded case AGAINST the selected outcome. Do not manufacture contradictions."
      : "Estimate the selected outcome from the evidence while preserving uncertainty.";

    const evidence = selectEvidence(request.evidence);
    const allowedEvidence = new Set(evidence.map((item) => item.id));

    const system = [
      "You are 0-1's bounded prediction-market forecaster.",
      roleInstruction,
      "This is an evidence-only reasoning step and no external lookup is permitted.",
      "Use only the supplied evidence; do not execute trades or make capital decisions.",
      "Return one JSON object and nothing else.",
      "Required keys: probability, confidence, evidence_ids, assumptions, rationale.",
      "probability and confidence must be numbers in [0,1].",
      "evidence_ids must contain only supplied evidence IDs and at least one ID.",
      "assumptions should be an array of short strings; use [] when none are needed.",
    ].join(" ");

    const user = JSON.stringify({
      question: request.routing.resolution.question,
      outcomes: request.routing.resolution.outcomes,
      selectedOutcomeIndex: request.outcomeIndex,
      selectedOutcome: request.outcomeLabel,
      marketProbability: request.marketProbability,
      closesAtMs: request.routing.resolution.closesAtMs,
      resolvesAtMs: request.routing.resolution.resolvesAtMs,
      acceptableDataSources: request.routing.resolution.acceptableDataSources,
      ambiguities: request.routing.resolution.ambiguities,
      invalidationConditions: request.routing.resolution.invalidationConditions,
      classification: {
        domain: request.routing.classification.domain,
        archetype: request.routing.classification.archetype,
        specialists: request.routing.classification.specialists,
      },
      evidence: evidence.map((item) => ({
        id: item.id,
        source: item.source,
        sourceType: item.sourceType,
        reliability: item.reliability,
        independenceGroup: item.independenceGroup,
        observedAtMs: item.observedAtMs,
        summary: item.summary.slice(0, 320),
        value: compactValue(item.value),
      })),
    });

    const raw = await this.client.chat(system, user);
    const parsed = validate(
      normalizeStructuredOpinion(parseHermesJson<unknown>(raw)),
      allowedEvidence,
    );

    const relevantExpiries = evidence
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
