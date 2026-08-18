import test from "node:test";
import assert from "node:assert/strict";
import { annualizedRealizedVolatility, blendedVolatility, forecastThresholdProbability, normalCdf } from "../src/forecast/crypto/model.js";
import { parseCryptoThresholdMarket } from "../src/forecast/crypto/parser.js";

test("normal CDF is approximately centered", () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
});

test("threshold probability increases when spot is farther above threshold", () => {
  const near = forecastThresholdProbability({ spot: 100, threshold: 100, direction: "ABOVE", annualizedVolatility: 0.5, horizonYears: 1 / 365 });
  const far = forecastThresholdProbability({ spot: 110, threshold: 100, direction: "ABOVE", annualizedVolatility: 0.5, horizonYears: 1 / 365 });
  assert.ok(far.probability > near.probability);
});

test("below probability complements above probability", () => {
  const above = forecastThresholdProbability({ spot: 100, threshold: 105, direction: "ABOVE", annualizedVolatility: 0.6, horizonYears: 2 / 365 });
  const below = forecastThresholdProbability({ spot: 100, threshold: 105, direction: "BELOW", annualizedVolatility: 0.6, horizonYears: 2 / 365 });
  assert.ok(Math.abs(above.probability + below.probability - 1) < 1e-9);
});

test("realized volatility is non-negative and blended from windows", () => {
  const closes = Array.from({ length: 241 }, (_, index) => 100 * Math.exp(0.001 * Math.sin(index / 3) + 0.0002 * index));
  const rv = annualizedRealizedVolatility(closes.slice(-31));
  const blended = blendedVolatility(closes);
  assert.ok(rv >= 0);
  assert.ok(blended.annualized >= 0);
  assert.equal(blended.samples, 241);
});

test("parses supported terminal BTC threshold question", () => {
  const parsed = parseCryptoThresholdMarket(
    "Will Bitcoin be above $120,000 at settlement?",
    ["Yes", "No"],
    Date.UTC(2026, 7, 20),
  );
  assert.ok(parsed);
  assert.equal(parsed?.asset, "BTC");
  assert.equal(parsed?.symbol, "BTCUSDT");
  assert.equal(parsed?.threshold, 120000);
  assert.equal(parsed?.direction, "ABOVE");
  assert.equal(parsed?.trueOutcomeIndex, 0);
});

test("refuses path-dependent hit/touch questions", () => {
  const parsed = parseCryptoThresholdMarket(
    "Will ETH hit $5,000 at any time before Friday?",
    ["Yes", "No"],
    Date.UTC(2026, 7, 21),
  );
  assert.equal(parsed, null);
});

test("refuses non-binary outcomes", () => {
  const parsed = parseCryptoThresholdMarket(
    "Will SOL be below $100 at settlement?",
    ["Low", "Medium", "High"],
    Date.UTC(2026, 7, 20),
  );
  assert.equal(parsed, null);
});
