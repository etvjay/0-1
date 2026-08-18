import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTrade } from "../src/domain/evaluate.js";
import type {
  MarketBelief,
  MarketSnapshot,
  PortfolioState,
  QuoteObservation,
  TradePolicy,
} from "../src/domain/types.js";

const now = 1_800_000_000_000;
const marketId = "0x1111111111111111111111111111111111111111" as const;

const snapshot: MarketSnapshot = {
  marketId,
  question: "Will X happen?",
  outcomes: ["YES", "NO"],
  outcomeIndex: 0,
  outcome: "YES",
  marketProbability: 0.55,
  observedAt: now - 1_000,
};

const belief: MarketBelief = {
  marketId,
  outcomeIndex: 0,
  probability: 0.72,
  confidence: 0.8,
  createdAt: now - 10_000,
  expiresAt: now + 60_000,
  method: "fixture",
  rationale: "test",
  evidence: [],
  invalidationConditions: [],
};

const quote: QuoteObservation = {
  shares: 1,
  tokensIn: 0.6,
  averagePrice: 0.6,
  quotedAt: now - 500,
};

const portfolio: PortfolioState = {
  accountValue: 100,
  marketExposure: 2,
};

const policy: TradePolicy = {
  minConfidence: 0.6,
  minExecutionEdge: 0.03,
  maxQuoteAgeMs: 5_000,
  maxBeliefAgeMs: 300_000,
  maxPositionFraction: 0.2,
  maxPriceImpact: 0.08,
};

test("proposes trade from executable edge rather than spot edge alone", () => {
  const result = evaluateTrade(snapshot, belief, quote, portfolio, policy, now);
  assert.equal(result.status, "PROPOSED");
  if (result.status !== "PROPOSED") return;
  assert.equal(Number(result.spotEdge.toFixed(2)), 0.17);
  assert.equal(Number(result.executionEdge.toFixed(2)), 0.12);
  assert.equal(Number(result.expectedValue.toFixed(2)), 0.12);
});

test("refuses when LMSR impact removes nominal spot edge", () => {
  const impacted = { ...quote, tokensIn: 0.71, averagePrice: 0.71 };
  const result = evaluateTrade(snapshot, belief, impacted, portfolio, policy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "NO_EDGE");
});

test("refuses stale quote", () => {
  const stale = { ...quote, quotedAt: now - 5_001 };
  const result = evaluateTrade(snapshot, belief, stale, portfolio, policy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "QUOTE_STALE");
});

test("refuses stale belief", () => {
  const staleBelief = { ...belief, createdAt: now - 300_001 };
  const result = evaluateTrade(snapshot, staleBelief, quote, portfolio, policy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "BELIEF_STALE");
});

test("refuses concentration beyond market exposure cap", () => {
  const concentratedPortfolio = { accountValue: 10, marketExposure: 1.8 };
  const result = evaluateTrade(snapshot, belief, quote, concentratedPortfolio, policy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "EXPOSURE_LIMIT");
});

test("refuses belief bound to another outcome", () => {
  const mismatched = { ...belief, outcomeIndex: 1 };
  const result = evaluateTrade(snapshot, mismatched, quote, portfolio, policy, now);
  assert.equal(result.status, "REFUSED");
  if (result.status !== "REFUSED") return;
  assert.equal(result.code, "BELIEF_MISMATCH");
});
