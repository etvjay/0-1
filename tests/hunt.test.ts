import assert from "node:assert/strict";
import test from "node:test";
import { forecastSides } from "../src/hunt/evaluate.js";
import { rankTriage, triageMarket } from "../src/hunt/triage.js";
import type { EvidenceCouncilForecast } from "../src/forecast/evidence/types.js";

const marketId = "0x1111111111111111111111111111111111111111" as const;
const now = Date.UTC(2026, 7, 18, 18, 0, 0);
const approxEqual = (actual: number, expected: number, epsilon = 1e-12): void => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);
};

test("triage favors near-resolution resolvable binary markets", () => {
  const near = triageMarket({
    marketId,
    question: "Will Acme announce Product X by tomorrow?",
    outcomes: ["Yes", "No"],
    category: "culture",
    resolvesAt: new Date(now + 2 * 3_600_000).toISOString(),
    settlesAt: null,
    dataSources: ["https://acme.example/newsroom"],
    probabilities: [0.52, 0.48],
    observedAtMs: now,
  }, now)[0]!;

  const far = triageMarket({
    marketId,
    question: "Will Acme announce Product X this year?",
    outcomes: ["Yes", "No"],
    category: "culture",
    resolvesAt: new Date(now + 120 * 24 * 3_600_000).toISOString(),
    settlesAt: null,
    dataSources: [],
    probabilities: [0.52, 0.48],
    observedAtMs: now,
  }, now)[0]!;

  assert.ok(near.triageScore > far.triageScore);
  assert.equal(rankTriage([far, near])[0], near);
});

test("binary forecast exposes complementary opposite side", () => {
  const candidate = triageMarket({
    marketId,
    question: "Will Acme announce Product X tomorrow?",
    outcomes: ["Yes", "No"],
    category: "culture",
    resolvesAt: new Date(now + 24 * 3_600_000).toISOString(),
    settlesAt: null,
    dataSources: ["https://acme.example"],
    probabilities: [0.4, 0.6],
    observedAtMs: now,
  }, now)[0]!;

  const forecast: EvidenceCouncilForecast = {
    status: "FORECAST",
    marketId,
    outcomeIndex: 0,
    probability: 0.7,
    confidence: 0.8,
    marketProbability: 0.4,
    method: "evidence-council-v1",
    generatedAtMs: now,
    expiresAtMs: now + 600_000,
    validOpinionIds: ["a", "b"],
    evidenceIds: ["e1", "e2"],
    assumptions: [],
    contradictions: [],
    disagreement: 0.05,
    effectiveIndependentSources: 2,
    rationale: "test",
  };

  const sides = forecastSides(candidate, forecast, [0.42, 0.58]);
  assert.equal(sides.length, 2);
  assert.equal(sides[0]!.probability, 0.7);
  approxEqual(sides[1]!.probability, 0.3);
  assert.equal(sides[1]!.derivedAsComplement, true);
  assert.equal(sides[1]!.marketProbability, 0.58);
});

test("multi-outcome forecasts are not assigned invalid complements", () => {
  const candidate = triageMarket({
    marketId,
    question: "Who will win the race?",
    outcomes: ["A", "B", "C"],
    category: "sports",
    resolvesAt: new Date(now + 3_600_000).toISOString(),
    settlesAt: null,
    dataSources: [],
    probabilities: [0.4, 0.35, 0.25],
    observedAtMs: now,
  }, now)[0]!;

  const forecast: EvidenceCouncilForecast = {
    status: "FORECAST",
    marketId,
    outcomeIndex: 0,
    probability: 0.5,
    confidence: 0.8,
    marketProbability: 0.4,
    method: "evidence-council-v1",
    generatedAtMs: now,
    expiresAtMs: now + 600_000,
    validOpinionIds: ["a", "b"],
    evidenceIds: ["e1", "e2"],
    assumptions: [],
    contradictions: [],
    disagreement: 0.05,
    effectiveIndependentSources: 2,
    rationale: "test",
  };

  assert.equal(forecastSides(candidate, forecast, [0.4, 0.35, 0.25]).length, 1);
});
