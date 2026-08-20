import type {
  EvidenceCouncilForecast,
  EvidenceCouncilPolicy,
  EvidenceCouncilRefusal,
  EvidenceCouncilResult,
  EvidenceForecastBundle,
  EvidenceItem,
  ForecastOpinion,
} from "./types.js";

const refuse = (
  code: EvidenceCouncilRefusal["code"],
  reason: string,
  now: number,
): EvidenceCouncilRefusal => ({ status: "REFUSED", code, reason, evaluatedAtMs: now });

const validProbability = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const weightedMean = (pairs: Array<{ value: number; weight: number }>): number => {
  const denominator = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  if (denominator <= 0) return 0.5;
  return pairs.reduce((sum, pair) => sum + pair.value * pair.weight, 0) / denominator;
};

const weightedVariance = (pairs: Array<{ value: number; weight: number }>, mean: number): number => {
  const denominator = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  if (denominator <= 0) return 0;
  return pairs.reduce((sum, pair) => sum + pair.weight * (pair.value - mean) ** 2, 0) / denominator;
};

const sourceStrength = (evidence: EvidenceItem[], ids: string[], now: number): { strength: number; groups: Set<string>; evidenceIds: string[] } => {
  const selected = evidence.filter((item) => ids.includes(item.id) && (item.expiresAtMs === null || item.expiresAtMs >= now));
  const bestByGroup = new Map<string, EvidenceItem>();
  for (const item of selected) {
    if (!validProbability(item.reliability)) continue;
    const current = bestByGroup.get(item.independenceGroup);
    if (!current || item.reliability > current.reliability) bestByGroup.set(item.independenceGroup, item);
  }
  const unique = [...bestByGroup.values()];
  const strength = unique.length === 0 ? 0 : unique.reduce((sum, item) => sum + item.reliability, 0) / unique.length;
  return {
    strength,
    groups: new Set(unique.map((item) => item.independenceGroup)),
    evidenceIds: unique.map((item) => item.id),
  };
};

const normalizeOpinion = (
  opinion: ForecastOpinion,
  bundle: EvidenceForecastBundle,
  policy: EvidenceCouncilPolicy,
  now: number,
): { opinion: ForecastOpinion; weight: number; groups: Set<string>; evidenceIds: string[] } | null => {
  if (opinion.marketId !== bundle.routing.resolution.marketId || opinion.outcomeIndex !== bundle.outcomeIndex) return null;
  if (!validProbability(opinion.probability) || !validProbability(opinion.confidence)) return null;
  if (opinion.confidence < policy.minOpinionConfidence) return null;
  if (opinion.generatedAtMs > now || opinion.expiresAtMs < now || now - opinion.generatedAtMs > policy.maxOpinionAgeMs) return null;

  const bound = sourceStrength(bundle.evidence, opinion.evidenceIds, now);
  if (opinion.evidenceIds.length > 0 && bound.evidenceIds.length === 0) return null;

  const evidenceWeight = opinion.evidenceIds.length === 0 ? 0.5 : Math.max(0.05, bound.strength);
  const roleMultiplier = opinion.role === "OPPOSE" ? policy.opposeWeightMultiplier : 1;
  return {
    opinion,
    weight: Math.max(0.001, opinion.confidence * evidenceWeight * roleMultiplier),
    groups: bound.groups,
    evidenceIds: bound.evidenceIds,
  };
};

export function evaluateEvidenceCouncil(
  bundle: EvidenceForecastBundle,
  policy: EvidenceCouncilPolicy,
  now = Date.now(),
): EvidenceCouncilResult {
  if (
    bundle.schemaVersion !== "0-1.evidence-bundle.v1" ||
    !validProbability(bundle.marketProbability) ||
    !Number.isInteger(bundle.outcomeIndex) ||
    bundle.outcomeIndex < 0
  ) {
    return refuse("INVALID_BUNDLE", "Bundle schema, market prior, or outcome index is invalid.", now);
  }

  if (bundle.routing.resolution.ambiguities.length > policy.maxResolutionAmbiguities) {
    return refuse(
      "AMBIGUOUS_RESOLUTION",
      `Resolution has ${bundle.routing.resolution.ambiguities.length} ambiguities, above policy maximum ${policy.maxResolutionAmbiguities}.`,
      now,
    );
  }

  const normalized = bundle.opinions
    .map((opinion) => normalizeOpinion(opinion, bundle, policy, now))
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (normalized.length === 0) {
    const hadOpinions = bundle.opinions.length > 0;
    return refuse(
      hadOpinions ? "STALE_OPINIONS" : "NO_VALID_OPINIONS",
      hadOpinions ? "No opinion survived binding, freshness, confidence, and evidence checks." : "Bundle contains no forecast opinions.",
      now,
    );
  }

  const survivingRoles = new Set(normalized.map((item) => item.opinion.role));
  const missingRoles = policy.requiredOpinionRoles.filter((role) => !survivingRoles.has(role));
  if (missingRoles.length > 0) {
    return refuse(
      "MISSING_ROLES",
      `Required opinion roles did not survive council validation: ${missingRoles.join(", ")}.`,
      now,
    );
  }

  const independentGroups = new Set<string>();
  for (const item of normalized) for (const group of item.groups) independentGroups.add(group);
  if (independentGroups.size < policy.minIndependentSources) {
    return refuse(
      "MISSING_EVIDENCE",
      `Only ${independentGroups.size} independent evidence groups survived; policy requires ${policy.minIndependentSources}.`,
      now,
    );
  }

  const opinionPairs = normalized.map((item) => ({ value: item.opinion.probability, weight: item.weight }));
  const opinionMean = weightedMean(opinionPairs);
  const disagreement = Math.sqrt(weightedVariance(opinionPairs, opinionMean));
  if (disagreement > policy.maxDisagreement) {
    return refuse(
      "EXCESSIVE_DISAGREEMENT",
      `Forecast disagreement ${disagreement.toFixed(4)} exceeds policy ceiling ${policy.maxDisagreement.toFixed(4)}.`,
      now,
    );
  }

  const marketWeight = Math.max(0, policy.marketPriorWeight);
  const probability = weightedMean([
    ...opinionPairs,
    { value: bundle.marketProbability, weight: marketWeight },
  ]);

  const meanConfidence = weightedMean(normalized.map((item) => ({ value: item.opinion.confidence, weight: item.weight })));
  const sourceCoverage = clamp01(independentGroups.size / Math.max(policy.minIndependentSources, 3));
  const disagreementPenalty = clamp01(1 - disagreement / Math.max(policy.maxDisagreement, 1e-9));
  const confidence = clamp01(meanConfidence * 0.55 + sourceCoverage * 0.25 + disagreementPenalty * 0.2);

  const evidenceIds = [...new Set(normalized.flatMap((item) => item.evidenceIds))];
  const assumptions = [...new Set(normalized.flatMap((item) => item.opinion.assumptions))];
  const contradictions = bundle.evidence
    .filter((item) => item.stance === "CONTRADICTS" && evidenceIds.includes(item.id))
    .map((item) => item.summary);
  const expiresAtMs = Math.min(...normalized.map((item) => item.opinion.expiresAtMs));

  const result: EvidenceCouncilForecast = {
    status: "FORECAST",
    marketId: bundle.routing.resolution.marketId,
    outcomeIndex: bundle.outcomeIndex,
    probability: clamp01(probability),
    confidence,
    marketProbability: bundle.marketProbability,
    method: "evidence-council-v1",
    generatedAtMs: now,
    expiresAtMs,
    validOpinionIds: normalized.map((item) => item.opinion.id),
    evidenceIds,
    assumptions,
    contradictions,
    disagreement,
    effectiveIndependentSources: independentGroups.size,
    rationale: `Aggregated ${normalized.length} bound opinions across ${independentGroups.size} independent evidence groups with an explicit market prior.`,
  };
  return result;
}

export const defaultEvidenceCouncilPolicy: EvidenceCouncilPolicy = {
  minOpinionConfidence: 0.45,
  maxOpinionAgeMs: 30 * 60 * 1000,
  maxDisagreement: 0.22,
  minIndependentSources: 2,
  requiredOpinionRoles: ["ADVOCATE", "OPPOSE"],
  maxResolutionAmbiguities: 1,
  marketPriorWeight: 0.75,
  opposeWeightMultiplier: 1.15,
};
