import type { CryptoDirection, CryptoThresholdSpec } from "./types.js";

const ASSETS: Array<{ names: RegExp; asset: string; symbol: string }> = [
  { names: /\b(bitcoin|btc)\b/i, asset: "BTC", symbol: "BTCUSDT" },
  { names: /\b(ethereum|ether|eth)\b/i, asset: "ETH", symbol: "ETHUSDT" },
  { names: /\b(sol(?:ana)?)\b/i, asset: "SOL", symbol: "SOLUSDT" },
  { names: /\b(bnb|binance coin)\b/i, asset: "BNB", symbol: "BNBUSDT" },
];

const ABOVE_PATTERNS = [
  /(?:above|over|higher than|greater than|exceed(?:s|ing)?|at least)\s*\$?([0-9][0-9,]*(?:\.[0-9]+)?)/i,
  /\$?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:or higher|or more|and above)/i,
];
const BELOW_PATTERNS = [
  /(?:below|under|lower than|less than|at most)\s*\$?([0-9][0-9,]*(?:\.[0-9]+)?)/i,
  /\$?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:or lower|or less|and below)/i,
];

function parseThreshold(question: string): { threshold: number; direction: CryptoDirection } | null {
  for (const pattern of ABOVE_PATTERNS) {
    const match = question.match(pattern);
    if (match?.[1]) return { threshold: Number(match[1].replaceAll(",", "")), direction: "ABOVE" };
  }
  for (const pattern of BELOW_PATTERNS) {
    const match = question.match(pattern);
    if (match?.[1]) return { threshold: Number(match[1].replaceAll(",", "")), direction: "BELOW" };
  }
  return null;
}

function findBinaryOutcomeIndices(outcomes: string[]): { trueOutcomeIndex: number; falseOutcomeIndex: number | null } | null {
  const yesIndex = outcomes.findIndex((value) => /^(yes|true)$/i.test(value.trim()));
  const noIndex = outcomes.findIndex((value) => /^(no|false)$/i.test(value.trim()));
  if (yesIndex >= 0) return { trueOutcomeIndex: yesIndex, falseOutcomeIndex: noIndex >= 0 ? noIndex : null };
  return null;
}

export function parseCryptoThresholdMarket(
  question: string,
  outcomes: string[],
  resolvesAtMs: number,
): CryptoThresholdSpec | null {
  if (!Number.isFinite(resolvesAtMs) || resolvesAtMs <= 0) return null;
  const asset = ASSETS.find((candidate) => candidate.names.test(question));
  if (!asset) return null;
  const threshold = parseThreshold(question);
  if (!threshold || !Number.isFinite(threshold.threshold) || threshold.threshold <= 0) return null;
  const indices = findBinaryOutcomeIndices(outcomes);
  if (!indices) return null;

  // Refuse path-dependent questions. This v1 model only supports terminal-price semantics.
  if (/\b(any time|ever|touch|hit|reach(?:es|ed)? before|during|between)\b/i.test(question)) return null;

  return {
    asset: asset.asset,
    symbol: asset.symbol,
    threshold: threshold.threshold,
    direction: threshold.direction,
    resolvesAtMs,
    trueOutcomeIndex: indices.trueOutcomeIndex,
    falseOutcomeIndex: indices.falseOutcomeIndex,
    parserConfidence: 0.9,
  };
}
