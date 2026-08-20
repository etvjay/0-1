import test from "node:test";
import assert from "node:assert/strict";
import { defaultEvidenceCouncilPolicy, evaluateEvidenceCouncil } from "../src/forecast/evidence/council.js";
import type { EvidenceForecastBundle } from "../src/forecast/evidence/types.js";

const marketId = "0x1111111111111111111111111111111111111111" as const;
const now = 1_800_000_000_000;

const baseBundle = (): EvidenceForecastBundle => ({
  schemaVersion: "0-1.evidence-bundle.v1",
  generatedAtMs: now - 1_000,
  outcomeIndex: 0,
  marketProbability: 0.55,
  routing: {
    resolution: {
      marketId,
      question: "Will candidate X win?",
      outcomes: ["YES", "NO"],
      closesAtMs: null,
      resolvesAtMs: now + 86_400_000,
      settlesAtMs: now + 86_400_000,
      acceptableDataSources: [],
      ambiguities: [],
      invalidationConditions: [],
    },
    classification: {
      domain: "POLITICS",
      archetype: "ELECTION_OR_POLL",
      confidence: 0.9,
      specialists: ["politics-polling-v1", "research-evidence-v1"],
      reasons: ["fixture"],
    },
  },
  evidence: [
    {
      id: "poll-a",
      source: "source-a",
      sourceType: "DATA_FEED",
      observedAtMs: now - 60_000,
      expiresAtMs: now + 300_000,
      supports: "Candidate X leading",
      value: { x: 52, y: 48 },
      stance: "SUPPORTS",
      reliability: 0.8,
      independenceGroup: "pollster-a",
      summary: "Independent poll A has X ahead.",
    },
    {
      id: "poll-b",
      source: "source-b",
      sourceType: "DATA_FEED",
      observedAtMs: now - 60_000,
      expiresAtMs: now + 300_000,
      supports: "Candidate X competitive",
      value: { x: 51, y: 49 },
      stance: "SUPPORTS",
      reliability: 0.75,
      independenceGroup: "pollster-b",
      summary: "Independent poll B has X narrowly ahead.",
    },
    {
      id: "counter",
      source: "source-c",
      sourceType: "NEWS",
      observedAtMs: now - 30_000,
      expiresAtMs: now + 300_000,
      supports: "Turnout uncertainty",
      value: null,
      stance: "CONTRADICTS",
      reliability: 0.65,
      independenceGroup: "analysis-c",
      summary: "Turnout model is less favorable to X.",
    },
  ],
  opinions: [
    {
      id: "advocate",
      marketId,
      outcomeIndex: 0,
      role: "ADVOCATE",
      probability: 0.64,
      confidence: 0.75,
      method: "polling",
      methodVersion: "1",
      generatedAtMs: now - 20_000,
      expiresAtMs: now + 300_000,
      evidenceIds: ["poll-a", "poll-b"],
      assumptions: ["poll errors are not perfectly correlated"],
      rationale: "Two independent polls favor X.",
    },
    {
      id: "oppose",
      marketId,
      outcomeIndex: 0,
      role: "OPPOSE",
      probability: 0.48,
      confidence: 0.65,
      method: "turnout-opposition",
      methodVersion: "1",
      generatedAtMs: now - 20_000,
      expiresAtMs: now + 300_000,
      evidenceIds: ["counter"],
      assumptions: ["turnout model is directionally informative"],
      rationale: "Counter-case says headline polls overstate X.",
    },
  ],
});

test("aggregates bound opinions with market prior and preserves contradictions", () => {
  const result = evaluateEvidenceCouncil(baseBundle(), defaultEvidenceCouncilPolicy, now);
  assert.equal(result.status, "FORECAST");
  if (result.status !== "FORECAST") return;
  assert.ok(result.probability > 0.5 && result.probability < 0.64);
  assert.ok(result.confidence > 0.5);
  assert.equal(result.effectiveIndependentSources, 3);
  assert.equal(result.contradictions.length, 1);
});

test("refuses excessive disagreement", () => {
  const bundle = baseBundle();
  bundle.opinions[0] = { ...bundle.opinions[0]!, probability: 0.9 };
  bundle.opinions[1] = { ...bundle.opinions[1]!, probability: 0.1 };
  const result = evaluateEvidenceCouncil(bundle, defaultEvidenceCouncilPolicy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "EXCESSIVE_DISAGREEMENT");
});

test("refuses when one required adversarial role is missing", () => {
  const bundle = baseBundle();
  bundle.opinions = [bundle.opinions[0]!];
  const result = evaluateEvidenceCouncil(bundle, defaultEvidenceCouncilPolicy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "MISSING_ROLES");
});

test("refuses when only one independent evidence group survives", () => {
  const bundle = baseBundle();
  bundle.evidence = bundle.evidence.filter((item) => item.independenceGroup === "pollster-a");
  bundle.opinions = [
    { ...bundle.opinions[0]!, evidenceIds: ["poll-a"] },
    { ...bundle.opinions[1]!, evidenceIds: ["poll-a"] },
  ];
  const result = evaluateEvidenceCouncil(bundle, defaultEvidenceCouncilPolicy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "MISSING_EVIDENCE");
});

test("refuses ambiguous resolution semantics before forecasting", () => {
  const bundle = baseBundle();
  bundle.routing.resolution.ambiguities = ["ambiguous A", "ambiguous B"];
  const result = evaluateEvidenceCouncil(bundle, defaultEvidenceCouncilPolicy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "AMBIGUOUS_RESOLUTION");
});
