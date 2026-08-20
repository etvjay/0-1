const structuralQuoteSizes = [0.1, 0.25, 0.5, 0.75, 1, 2, 3, 5, 8];

export const defaultCapitalTargetsTst = [1, 2, 5, 10, 25, 50, 75, 100, 150];

const rounded = (value: number): number => Number(value.toFixed(6));

export function buildAdaptiveQuoteSizes(input: {
  seedSizes: number[];
  marketProbability: number;
  maxOrderTst: number;
  capitalTargetsTst?: number[];
  maxShares?: number;
}): number[] {
  const {
    seedSizes,
    marketProbability,
    maxOrderTst,
    capitalTargetsTst = defaultCapitalTargetsTst,
    maxShares = 1_000,
  } = input;

  if (!Number.isFinite(marketProbability) || marketProbability < 0 || marketProbability > 1) {
    throw new Error("marketProbability must be in [0,1]");
  }
  if (!Number.isFinite(maxOrderTst) || maxOrderTst <= 0) {
    throw new Error("maxOrderTst must be positive");
  }
  if (!Number.isFinite(maxShares) || maxShares <= 0) {
    throw new Error("maxShares must be positive");
  }

  // Spot price is only an initial sizing anchor. Exact LMSR quotes remain the
  // authority, so every generated size is still re-priced and policy-checked.
  // The floor/ceiling prevent pathological share estimates near p=0 or p=1.
  const priceAnchor = Math.min(0.95, Math.max(0.05, marketProbability));
  const targets = [...capitalTargetsTst, maxOrderTst]
    .filter((target) => Number.isFinite(target) && target > 0 && target <= maxOrderTst)
    .map(rounded);

  const capitalSizedShares = targets.map((target) => rounded(target / priceAnchor));
  const combined = [...structuralQuoteSizes, ...seedSizes, ...capitalSizedShares]
    .filter((shares) => Number.isFinite(shares) && shares > 0 && shares <= maxShares)
    .map(rounded);

  return [...new Set(combined)].sort((a, b) => a - b);
}
