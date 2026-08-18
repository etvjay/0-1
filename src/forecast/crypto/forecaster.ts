import type { MarketBelief, MarketSnapshot } from "../../domain/types.js";
import { appendJsonl, sha256Json } from "../../history/io.js";
import type { ForecastRecord } from "../../history/types.js";
import { fetchMinuteCloses, fetchReferencePrice } from "./binance.js";
import { blendedVolatility, forecastThresholdProbability } from "./model.js";
import { parseCryptoThresholdMarket } from "./parser.js";
import type { CryptoMarketForecast } from "./types.js";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export async function forecastCryptoThresholdMarket(args: {
  marketId: `0x${string}`;
  question: string;
  outcomes: string[];
  marketProbabilities: number[];
  resolvesAtMs: number;
  nowMs?: number;
}): Promise<{ forecast: CryptoMarketForecast; snapshot: MarketSnapshot; belief: MarketBelief; record: ForecastRecord }> {
  const nowMs = args.nowMs ?? Date.now();
  const spec = parseCryptoThresholdMarket(args.question, args.outcomes, args.resolvesAtMs);
  if (!spec) throw new Error("Market is not a supported terminal crypto-threshold market");
  if (spec.resolvesAtMs <= nowMs) throw new Error("Market resolution time is not in the future");

  const marketProbability = args.marketProbabilities[spec.trueOutcomeIndex];
  if (marketProbability === undefined || !Number.isFinite(marketProbability)) throw new Error("True outcome has no live market probability");

  const [referencePrice, closes] = await Promise.all([
    fetchReferencePrice(spec.symbol),
    fetchMinuteCloses(spec.symbol),
  ]);
  const volatility = blendedVolatility(closes, 1);
  const horizonYears = (spec.resolvesAtMs - nowMs) / MS_PER_YEAR;
  const model = forecastThresholdProbability({
    spot: referencePrice.mid,
    threshold: spec.threshold,
    direction: spec.direction,
    annualizedVolatility: volatility.annualized,
    horizonYears,
  });

  const spreadFraction = (referencePrice.ask - referencePrice.bid) / referencePrice.mid;
  const horizonHours = (spec.resolvesAtMs - nowMs) / 3_600_000;
  const confidence = Math.max(0.5, Math.min(0.92,
    spec.parserConfidence
      - Math.min(0.15, spreadFraction * 100)
      - (volatility.samples < 120 ? 0.08 : 0)
      - (horizonHours > 48 ? 0.08 : 0),
  ));

  const forecast: CryptoMarketForecast = {
    spec,
    referencePrice,
    volatility,
    probability: model.probability,
    confidence,
    marketProbability,
    spotEdge: model.probability - marketProbability,
    generatedAtMs: nowMs,
    method: model.method,
    rationale: `Terminal ${spec.asset} ${spec.direction.toLowerCase()} ${spec.threshold} probability from Binance Futures midpoint and blended 1m realized volatility.`,
  };

  const snapshot: MarketSnapshot = {
    marketId: args.marketId,
    question: args.question,
    outcomes: args.outcomes,
    outcomeIndex: spec.trueOutcomeIndex,
    outcome: args.outcomes[spec.trueOutcomeIndex] ?? `#${spec.trueOutcomeIndex}`,
    marketProbability,
    observedAt: nowMs,
  };

  const belief: MarketBelief = {
    marketId: args.marketId,
    outcomeIndex: spec.trueOutcomeIndex,
    probability: forecast.probability,
    confidence: forecast.confidence,
    createdAt: nowMs,
    expiresAt: Math.min(spec.resolvesAtMs, nowMs + 60_000),
    method: forecast.method,
    rationale: forecast.rationale,
    evidence: [
      {
        id: sha256Json(referencePrice),
        source: `binance-futures:${spec.symbol}:bookTicker`,
        observedAt: referencePrice.observedAtMs,
        freshnessMs: Math.max(0, nowMs - referencePrice.observedAtMs),
        support: "CONTEXT",
      },
      {
        id: sha256Json(volatility),
        source: `binance-futures:${spec.symbol}:1m-klines`,
        observedAt: nowMs,
        freshnessMs: 0,
        support: "CONTEXT",
      },
    ],
    invalidationConditions: [
      "Delphi resolution semantics are path-dependent rather than terminal-price based.",
      "The market resolves from a price source materially different from Binance Futures.",
      "Reference price or volatility evidence becomes stale before execution.",
    ],
  };

  const recordBase = {
    schemaVersion: "0-1.forecast.v1" as const,
    marketId: args.marketId,
    outcomeIndex: spec.trueOutcomeIndex,
    probability: forecast.probability,
    confidence: forecast.confidence,
    marketProbability,
    method: forecast.method,
    createdAtMs: nowMs,
  };
  const record: ForecastRecord = { id: sha256Json(recordBase), ...recordBase };
  return { forecast, snapshot, belief, record };
}

export async function persistCryptoForecast(record: ForecastRecord): Promise<void> {
  await appendJsonl(process.env.ZERO_ONE_FORECAST_LOG ?? "data/forecasts.jsonl", record);
}
