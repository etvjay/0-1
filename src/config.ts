import "dotenv/config";
import type { TradePolicy } from "./domain/types.js";

const numberEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be numeric`);
  return parsed;
};

export const tradePolicy: TradePolicy = {
  minConfidence: numberEnv("ZERO_ONE_MIN_CONFIDENCE", 0.6),
  minExecutionEdge: numberEnv("ZERO_ONE_MIN_EXECUTION_EDGE", 0.03),
  maxQuoteAgeMs: numberEnv("ZERO_ONE_MAX_QUOTE_AGE_MS", 5_000),
  maxBeliefAgeMs: numberEnv("ZERO_ONE_MAX_BELIEF_AGE_MS", 300_000),
  maxPositionFraction: numberEnv("ZERO_ONE_MAX_POSITION_FRACTION", 0.2),
  maxPriceImpact: numberEnv("ZERO_ONE_MAX_PRICE_IMPACT", 0.08),
};

// Competition LMSR markets can price a share anywhere from a few cents to
// nearly one token. A one-share ceiling therefore under-deploys capital on
// cheap, high-edge outcomes. Quote a wider ladder and let deterministic
// execution-edge, price-impact, exposure, and max-order caps reject sizes that
// are too aggressive for a particular market.
export const quoteSizes = (process.env.ZERO_ONE_QUOTE_SIZES ?? "0.1,0.25,0.5,0.75,1,2,3,5,8,12,16,24")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0)
  .sort((a, b) => a - b);

if (quoteSizes.length === 0) throw new Error("ZERO_ONE_QUOTE_SIZES produced no valid positive sizes");
