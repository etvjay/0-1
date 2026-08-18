import type { ForecastRecord, ForecastScore, ForecastScoreSummary, MarketResolution } from "./types.js";

const EPSILON = 1e-12;
const clampProbability = (p: number) => Math.min(1 - EPSILON, Math.max(EPSILON, p));

const brier = (probability: number, outcome: 0 | 1) => (probability - outcome) ** 2;
const logLoss = (probability: number, outcome: 0 | 1) => {
  const p = clampProbability(probability);
  return -(outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p));
};

const mean = (values: number[]): number | null => values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

export function scoreForecasts(
  forecasts: ForecastRecord[],
  resolutions: MarketResolution[],
): ForecastScoreSummary {
  const settledByMarket = new Map(
    resolutions
      .filter((resolution) => resolution.status === "SETTLED" && resolution.winningOutcomeIndex !== null)
      .map((resolution) => [resolution.marketId, resolution] as const),
  );

  const scores: ForecastScore[] = [];
  for (const forecast of forecasts) {
    if (!Number.isFinite(forecast.probability) || forecast.probability < 0 || forecast.probability > 1) continue;
    if (!Number.isFinite(forecast.marketProbability) || forecast.marketProbability < 0 || forecast.marketProbability > 1) continue;

    const resolution = settledByMarket.get(forecast.marketId);
    if (!resolution || resolution.winningOutcomeIndex === null) continue;
    if (forecast.createdAtMs >= resolution.timestampMs) continue;

    const observedOutcome: 0 | 1 = forecast.outcomeIndex === resolution.winningOutcomeIndex ? 1 : 0;
    const ourBrier = brier(forecast.probability, observedOutcome);
    const marketBrier = brier(forecast.marketProbability, observedOutcome);
    const ourLogLoss = logLoss(forecast.probability, observedOutcome);
    const marketLogLoss = logLoss(forecast.marketProbability, observedOutcome);

    scores.push({
      forecastId: forecast.id,
      marketId: forecast.marketId,
      outcomeIndex: forecast.outcomeIndex,
      resolvedOutcomeIndex: resolution.winningOutcomeIndex,
      probability: forecast.probability,
      marketProbability: forecast.marketProbability,
      observedOutcome,
      brier: ourBrier,
      marketBrier,
      brierSkillVsMarket: marketBrier - ourBrier,
      logLoss: ourLogLoss,
      marketLogLoss,
      logLossSkillVsMarket: marketLogLoss - ourLogLoss,
    });
  }

  return {
    resolvedForecasts: scores.length,
    meanBrier: mean(scores.map((score) => score.brier)),
    meanMarketBrier: mean(scores.map((score) => score.marketBrier)),
    meanBrierSkillVsMarket: mean(scores.map((score) => score.brierSkillVsMarket)),
    meanLogLoss: mean(scores.map((score) => score.logLoss)),
    meanMarketLogLoss: mean(scores.map((score) => score.marketLogLoss)),
    meanLogLossSkillVsMarket: mean(scores.map((score) => score.logLossSkillVsMarket)),
    scores,
  };
}
