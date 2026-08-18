import type { CryptoForecastInput, CryptoForecastResult, VolatilityEstimate } from "./types.js";

const SQRT_TWO = Math.sqrt(2);

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-abs * abs);
  return sign * y;
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / SQRT_TWO));
}

export function annualizedRealizedVolatility(
  closes: number[],
  intervalMinutes = 1,
): number {
  if (closes.length < 3) throw new Error("At least three closes are required for realized volatility");
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) throw new Error("intervalMinutes must be positive");
  if (closes.some((price) => !Number.isFinite(price) || price <= 0)) throw new Error("Close prices must be positive finite numbers");

  const returns: number[] = [];
  for (let index = 1; index < closes.length; index++) {
    const previous = closes[index - 1]!;
    const current = closes[index]!;
    returns.push(Math.log(current / previous));
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length - 1);
  const intervalsPerYear = (365.25 * 24 * 60) / intervalMinutes;
  return Math.sqrt(Math.max(variance, 0) * intervalsPerYear);
}

export function blendedVolatility(closes: number[], intervalMinutes = 1): VolatilityEstimate {
  if (closes.length < 31) throw new Error("At least 31 closes are required for blended volatility");
  const shortWindow = closes.slice(-31);
  const longWindow = closes.slice(-Math.min(closes.length, 241));
  const shortAnnualized = annualizedRealizedVolatility(shortWindow, intervalMinutes);
  const longAnnualized = annualizedRealizedVolatility(longWindow, intervalMinutes);
  const annualized = 0.65 * shortAnnualized + 0.35 * longAnnualized;
  return {
    annualized,
    shortAnnualized,
    longAnnualized,
    samples: longWindow.length,
    intervalMinutes,
  };
}

export function forecastThresholdProbability(input: CryptoForecastInput): CryptoForecastResult {
  const { spot, threshold, direction, annualizedVolatility, horizonYears } = input;
  if (![spot, threshold, annualizedVolatility, horizonYears].every(Number.isFinite)) throw new Error("Forecast inputs must be finite");
  if (spot <= 0 || threshold <= 0) throw new Error("spot and threshold must be positive");
  if (annualizedVolatility < 0 || horizonYears < 0) throw new Error("volatility and horizon must be non-negative");

  if (horizonYears === 0 || annualizedVolatility === 0) {
    const above = spot > threshold ? 1 : spot < threshold ? 0 : 0.5;
    return {
      probability: direction === "ABOVE" ? above : 1 - above,
      probabilityAbove: above,
      distanceLog: Math.log(spot / threshold),
      sigmaHorizon: 0,
      method: "gbm-zero-drift-rv-v1",
    };
  }

  const sigmaHorizon = annualizedVolatility * Math.sqrt(horizonYears);
  const logThresholdRatio = Math.log(threshold / spot);
  // Under zero-drift GBM: ln(S_T/S_0) ~ N(-0.5*sigma^2*T, sigma^2*T).
  const z = (logThresholdRatio + 0.5 * annualizedVolatility ** 2 * horizonYears) / sigmaHorizon;
  const probabilityAbove = Math.min(1, Math.max(0, 1 - normalCdf(z)));
  const probability = direction === "ABOVE" ? probabilityAbove : 1 - probabilityAbove;

  return {
    probability,
    probabilityAbove,
    distanceLog: Math.log(spot / threshold),
    sigmaHorizon,
    method: "gbm-zero-drift-rv-v1",
  };
}
