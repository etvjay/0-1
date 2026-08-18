import test from "node:test";
import assert from "node:assert/strict";
import { routeMarket } from "../src/forecast/router.js";
import { buildResearchPlan } from "../src/forecast/research/plan.js";
import { normalizeSearchEvidence } from "../src/forecast/research/normalize.js";
import { runAutonomousResearch } from "../src/forecast/research/orchestrator.js";
import type { OpinionProvider, SearchProvider } from "../src/forecast/research/types.js";

const routing = routeMarket({
  marketId: "0xabc",
  question: "Will Example Corp launch Product X before September 1, 2026?",
  outcomes: ["Yes", "No"],
  category: "culture",
  resolvesAt: "2026-09-01T00:00:00Z",
  settlesAt: "2026-09-02T00:00:00Z",
  dataSources: ["https://example.com/news"],
});

test("research plan includes primary, corroborating, opposing and base-rate queries", () => {
  const plan = buildResearchPlan(routing, 0, 1_000);
  assert.deepEqual(new Set(plan.queries.map((q) => q.intent)), new Set(["PRIMARY", "CORROBORATE", "OPPOSE", "BASE_RATE"]));
  assert.ok(plan.queries.find((q) => q.intent === "PRIMARY")?.includeDomains.includes("example.com"));
});

test("normalizer deduplicates same publisher/title into one independence group", () => {
  const rows = [1, 2].map((n) => ({
    schemaVersion: "0-1.search-result.v1" as const,
    id: `r${n}`,
    queryId: "q",
    queryIntent: "CORROBORATE" as const,
    provider: "mock",
    title: "Same story",
    url: `https://news.example.com/story?copy=${n}`,
    content: "Evidence",
    score: 0.9,
    publishedAtMs: 1_000,
    observedAtMs: 1_000,
  }));
  const evidence = normalizeSearchEvidence(rows, 2_000, 10_000);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.independenceGroup, "news.example.com");
});

test("orchestrator creates advocate and opposition opinions through injected providers", async () => {
  const search: SearchProvider = {
    name: "mock-search",
    async search({ query }) {
      const host = query.intent === "PRIMARY" ? "official.example" : `${query.intent.toLowerCase()}.example`;
      return [{
        schemaVersion: "0-1.search-result.v1",
        id: query.id,
        queryId: query.id,
        queryIntent: query.intent,
        provider: "mock-search",
        title: `${query.intent} result`,
        url: `https://${host}/${query.id}`,
        content: `${query.intent} evidence`,
        score: 0.8,
        publishedAtMs: 1_000,
        observedAtMs: 1_000,
      }];
    },
  };
  const opinion: OpinionProvider = {
    name: "mock-opinion",
    async forecast(request) {
      return {
        id: request.role,
        marketId: request.routing.resolution.marketId,
        outcomeIndex: request.outcomeIndex,
        role: request.role,
        probability: request.role === "ADVOCATE" ? 0.7 : 0.35,
        confidence: 0.7,
        method: "mock",
        methodVersion: "v1",
        generatedAtMs: request.nowMs,
        expiresAtMs: request.nowMs + 60_000,
        evidenceIds: request.evidence.slice(0, 2).map((e) => e.id),
        assumptions: [],
        rationale: "mock",
      };
    },
  };
  const result = await runAutonomousResearch({ routing, outcomeIndex: 0, marketProbability: 0.5 }, search, opinion, 2_000);
  assert.equal(result.bundle.opinions.length, 2);
  assert.equal(result.bundle.evidence.length >= 4, true);
  assert.deepEqual(result.bundle.opinions.map((o) => o.role), ["ADVOCATE", "OPPOSE"]);
});
