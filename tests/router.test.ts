import test from "node:test";
import assert from "node:assert/strict";
import { routeMarket } from "../src/forecast/router.js";

const marketId = "0x1111111111111111111111111111111111111111" as const;

const base = {
  marketId,
  outcomes: ["Yes", "No"],
  resolvesAt: "2026-08-20T12:00:00Z",
  settlesAt: "2026-08-20T13:00:00Z",
  dataSources: [],
};

test("routes sports markets to sports specialist", () => {
  const result = routeMarket({ ...base, category: "sports", question: "Will Arsenal beat Chelsea?" });
  assert.equal(result.classification.domain, "SPORTS");
  assert.equal(result.classification.archetype, "SPORTS_EVENT");
  assert.ok(result.classification.specialists.includes("sports-state-v1"));
});

test("routes election markets to polling/evidence specialists", () => {
  const result = routeMarket({ ...base, category: "politics", question: "Will Candidate A win the election?" });
  assert.equal(result.classification.archetype, "ELECTION_OR_POLL");
  assert.ok(result.classification.specialists.includes("politics-polling-v1"));
});

test("routes macro releases independently of category wording", () => {
  const result = routeMarket({ ...base, category: "miscellaneous", question: "Will US CPI be above 3% in the next release?" });
  assert.equal(result.classification.archetype, "MACRO_RELEASE");
  assert.ok(result.classification.specialists.includes("macro-nowcast-v1"));
});

test("crypto threshold remains only one specialist path", () => {
  const result = routeMarket({ ...base, category: "crypto", question: "Will BTC be above $100000 at resolution?" });
  assert.equal(result.classification.archetype, "TERMINAL_THRESHOLD");
  assert.ok(result.classification.specialists.includes("crypto-terminal-rv-v1"));
});

test("generic market falls back to research evidence and market prior", () => {
  const result = routeMarket({ ...base, category: "miscellaneous", question: "Will Company X announce a new CEO?" });
  assert.equal(result.classification.archetype, "SCHEDULED_ANNOUNCEMENT");
  assert.ok(result.classification.specialists.includes("research-evidence-v1"));
});
