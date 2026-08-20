import assert from "node:assert/strict";
import test from "node:test";
import { buildAdaptiveQuoteSizes } from "../src/hunt/sizing.js";

test("adaptive sizing expands beyond a stale one-share seed ladder", () => {
  const sizes = buildAdaptiveQuoteSizes({
    seedSizes: [0.1, 0.25, 0.5, 0.75, 1],
    marketProbability: 0.2,
    maxOrderTst: 150,
    capitalTargetsTst: [5, 25, 50, 100, 150],
  });

  assert.ok(sizes.includes(1));
  assert.ok(sizes.includes(25));
  assert.ok(sizes.includes(125));
  assert.ok(sizes.includes(250));
  assert.ok(sizes.includes(500));
  assert.ok(sizes.includes(750));
  assert.ok(Math.max(...sizes) > 1);
});

test("adaptive sizing respects target and share ceilings", () => {
  const sizes = buildAdaptiveQuoteSizes({
    seedSizes: [1, 2, 2_000],
    marketProbability: 0.01,
    maxOrderTst: 50,
    capitalTargetsTst: [5, 25, 50, 75, 100],
    maxShares: 600,
  });

  assert.ok(sizes.every((shares) => shares <= 600));
  // The price anchor is floored at 0.05, so 25 TST maps to 500 shares.
  assert.ok(sizes.includes(500));
  assert.ok(!sizes.includes(1_000));
  assert.ok(!sizes.includes(2_000));
});
