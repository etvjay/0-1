import test from "node:test";
import assert from "node:assert/strict";
import { ReplayClock } from "../src/history/replay.js";
import { scoreForecasts } from "../src/history/metrics.js";
import type { CompetitionHistorySnapshot, ForecastRecord } from "../src/history/types.js";

const marketId = "0x1111111111111111111111111111111111111111" as const;
const history: CompetitionHistorySnapshot = {
  schemaVersion: "0-1.history.snapshot.v1",
  competitionId: "fixture",
  generatedAtMs: 10_000,
  subgraph: {
    blockNumber: 100,
    blockTimestamp: 10,
    blockHash: "0xabc",
    deployment: "fixture",
    hasIndexingErrors: false,
  },
  markets: [{
    schemaVersion: "0-1.history.market.v1",
    marketId,
    question: "Will X happen?",
    outcomes: ["YES", "NO"],
    category: "test",
    currentStatus: "settled",
    createdAtMs: 1_000,
    settledAtMs: 9_000,
  }],
  trades: [
    {
      schemaVersion: "0-1.history.trade.v1",
      id: "t1",
      side: "BUY",
      marketId,
      actor: null,
      outcomeIndex: 0,
      sharesAtomic: "1000000000000000000",
      tokensAtomic: "600000",
      shares: 1,
      tokens: 0.6,
      averageExecutionPrice: 0.6,
      timestampMs: 3_000,
      blockNumber: 30,
      transactionHash: "0xt1",
    },
    {
      schemaVersion: "0-1.history.trade.v1",
      id: "t2",
      side: "BUY",
      marketId,
      actor: null,
      outcomeIndex: 0,
      sharesAtomic: "1000000000000000000",
      tokensAtomic: "700000",
      shares: 1,
      tokens: 0.7,
      averageExecutionPrice: 0.7,
      timestampMs: 7_000,
      blockNumber: 70,
      transactionHash: "0xt2",
    },
  ],
  resolutions: [{
    schemaVersion: "0-1.history.resolution.v1",
    id: "r1",
    marketId,
    status: "SETTLED",
    winningOutcomeIndex: 0,
    timestampMs: 9_000,
    blockNumber: 90,
    transactionHash: "0xr1",
  }],
};

test("replay hides trades and settlement after cutoff", () => {
  const view = new ReplayClock(history).at(marketId, 5_000);
  assert.equal(view.trades.length, 1);
  assert.equal(view.trades[0]?.id, "t1");
  assert.equal(view.resolution, null);
});

test("replay reveals settlement only after settlement timestamp", () => {
  const before = new ReplayClock(history).at(marketId, 8_999);
  const after = new ReplayClock(history).at(marketId, 9_000);
  assert.equal(before.resolution, null);
  assert.equal(after.resolution?.winningOutcomeIndex, 0);
});

test("forecast scoring rewards improvement over market baseline", () => {
  const forecasts: ForecastRecord[] = [{
    schemaVersion: "0-1.forecast.v1",
    id: "f1",
    marketId,
    outcomeIndex: 0,
    probability: 0.8,
    confidence: 0.8,
    marketProbability: 0.6,
    method: "fixture",
    createdAtMs: 5_000,
  }];
  const result = scoreForecasts(forecasts, history.resolutions);
  assert.equal(result.resolvedForecasts, 1);
  assert.ok((result.meanBrierSkillVsMarket ?? 0) > 0);
  assert.ok((result.meanLogLossSkillVsMarket ?? 0) > 0);
});

test("forecast created at settlement is excluded as hindsight", () => {
  const forecasts: ForecastRecord[] = [{
    schemaVersion: "0-1.forecast.v1",
    id: "future",
    marketId,
    outcomeIndex: 0,
    probability: 1,
    confidence: 1,
    marketProbability: 0.6,
    method: "cheat",
    createdAtMs: 9_000,
  }];
  assert.equal(scoreForecasts(forecasts, history.resolutions).resolvedForecasts, 0);
});
