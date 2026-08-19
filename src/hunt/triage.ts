import { routeMarket } from "../forecast/router.js";
import type { HunterMarketInput, TriageCandidate, TriageFeatures } from "./types.js";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const proximityScore = (nowMs: number, resolvesAt: string | null, settlesAt: string | null): number => {
  const raw = resolvesAt ?? settlesAt;
  if (!raw) return 0.25;
  const target = new Date(raw).getTime();
  if (!Number.isFinite(target)) return 0.25;
  const hours = Math.max(0, (target - nowMs) / 3_600_000);
  if (hours <= 1) return 1;
  if (hours <= 6) return 0.95;
  if (hours <= 24) return 0.85;
  if (hours <= 72) return 0.65;
  if (hours <= 168) return 0.45;
  return 0.25;
};

const uncertaintyScore = (probability: number): number => {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) return 0;
  return clamp01(1 - Math.abs(probability - 0.5) * 2);
};

const sourceSpecificityScore = (dataSources: unknown): number => {
  if (!Array.isArray(dataSources) || dataSources.length === 0) return 0.35;
  return clamp01(0.55 + Math.min(dataSources.length, 3) * 0.15);
};

const archetypeSupportScore = (specialists: string[]): number => {
  const specific = specialists.some((name) => name !== "research-evidence-v1" && name !== "market-prior-v1");
  return specific ? 0.9 : 0.6;
};

const outcomeEfficiencyScore = (outcomes: string[]): number => {
  if (outcomes.length === 2) return 1;
  if (outcomes.length <= 4) return 0.75;
  return 0.5;
};

export function triageMarket(input: HunterMarketInput, nowMs = Date.now()): TriageCandidate[] {
  const routing = routeMarket({
    marketId: input.marketId,
    question: input.question,
    outcomes: input.outcomes,
    category: input.category,
    resolvesAt: input.resolvesAt,
    settlesAt: input.settlesAt,
    dataSources: input.dataSources,
  });

  const resolvability = clamp01(
    routing.classification.confidence * 0.65 +
    (routing.resolution.ambiguities.length === 0 ? 0.35 : 0.1),
  );
  const sourceSpecificity = sourceSpecificityScore(input.dataSources);
  const resolutionProximity = proximityScore(nowMs, input.resolvesAt, input.settlesAt);
  const archetypeSupport = archetypeSupportScore(routing.classification.specialists);
  const outcomeEfficiency = outcomeEfficiencyScore(input.outcomes);

  return input.outcomes.flatMap((outcome, outcomeIndex): TriageCandidate[] => {
    const rawMarketProbability = input.probabilities[outcomeIndex];
    if (typeof rawMarketProbability !== "number" || !Number.isFinite(rawMarketProbability)) return [];
    if (rawMarketProbability < 0 || rawMarketProbability > 1) return [];
    const marketProbability = rawMarketProbability;
    const marketUncertainty = uncertaintyScore(marketProbability);
    const features: TriageFeatures = {
      resolutionProximity,
      marketUncertainty,
      resolvability,
      sourceSpecificity,
      archetypeSupport,
      outcomeEfficiency,
    };
    const triageScore =
      resolutionProximity * 0.28 +
      marketUncertainty * 0.18 +
      resolvability * 0.22 +
      sourceSpecificity * 0.12 +
      archetypeSupport * 0.12 +
      outcomeEfficiency * 0.08;

    return [{
      marketId: input.marketId,
      question: input.question,
      outcomes: [...input.outcomes],
      probabilities: [...input.probabilities],
      outcomeIndex,
      outcome,
      marketProbability,
      routing,
      features,
      triageScore,
      reasons: [
        `resolutionProximity=${resolutionProximity.toFixed(3)}`,
        `marketUncertainty=${marketUncertainty.toFixed(3)}`,
        `resolvability=${resolvability.toFixed(3)}`,
        `sourceSpecificity=${sourceSpecificity.toFixed(3)}`,
        `archetypeSupport=${archetypeSupport.toFixed(3)}`,
      ],
      observedAtMs: input.observedAtMs,
    }];
  });
}

export function rankTriage(candidates: TriageCandidate[]): TriageCandidate[] {
  return [...candidates].sort((a, b) =>
    b.triageScore - a.triageScore ||
    b.features.resolutionProximity - a.features.resolutionProximity ||
    a.marketId.localeCompare(b.marketId) ||
    a.outcomeIndex - b.outcomeIndex,
  );
}
