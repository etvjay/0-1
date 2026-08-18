import type { SubgraphBuy, SubgraphSell } from "@gensyn-ai/gensyn-delphi-sdk";
import type { HexAddress } from "../domain/types.js";
import type { HistoricalTrade, MarketResolution } from "./types.js";

interface RawSettled {
  id: string;
  timestamp_: string;
  block_number: string;
  transactionHash_: string;
  marketProxy: string | null;
  winningOutcomeIdx: string | null;
}

interface RawFailed {
  id: string;
  timestamp_: string;
  block_number: string;
  transactionHash_: string;
  marketProxy: string | null;
}

const asAddress = (value: string | null): HexAddress | null => {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value.toLowerCase() as HexAddress;
};

const asFiniteInt = (value: string | null, label: string): number => {
  if (value === null || !/^-?\d+$/.test(value)) throw new Error(`${label} is not an integer string`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label} exceeds safe integer range`);
  return parsed;
};

const atomicToNumber = (value: string, decimals: number): number => {
  if (!/^\d+$/.test(value)) throw new Error(`Atomic amount is not an unsigned integer: ${value}`);
  const atomic = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = atomic / base;
  const fraction = atomic % base;
  return Number(whole) + Number(fraction) / Number(base);
};

export function normalizeBuy(raw: SubgraphBuy): HistoricalTrade | null {
  const marketId = asAddress(raw.marketProxy);
  if (!marketId || raw.outcomeIdx === null || raw.tokensIn === null || raw.sharesOut === null) return null;
  const shares = atomicToNumber(raw.sharesOut, 18);
  const tokens = atomicToNumber(raw.tokensIn, 6);
  if (!(shares > 0)) return null;

  return {
    schemaVersion: "0-1.history.trade.v1",
    id: raw.id,
    side: "BUY",
    marketId,
    actor: asAddress(raw.buyer),
    outcomeIndex: asFiniteInt(raw.outcomeIdx, "outcomeIdx"),
    sharesAtomic: raw.sharesOut,
    tokensAtomic: raw.tokensIn,
    shares,
    tokens,
    averageExecutionPrice: tokens / shares,
    timestampMs: asFiniteInt(raw.timestamp_, "timestamp") * 1000,
    blockNumber: asFiniteInt(raw.block_number, "block number"),
    transactionHash: raw.transactionHash_,
  };
}

export function normalizeSell(raw: SubgraphSell): HistoricalTrade | null {
  const marketId = asAddress(raw.marketProxy);
  if (!marketId || raw.outcomeIdx === null || raw.tokensOut === null || raw.sharesIn === null) return null;
  const shares = atomicToNumber(raw.sharesIn, 18);
  const tokens = atomicToNumber(raw.tokensOut, 6);
  if (!(shares > 0)) return null;

  return {
    schemaVersion: "0-1.history.trade.v1",
    id: raw.id,
    side: "SELL",
    marketId,
    actor: asAddress(raw.seller),
    outcomeIndex: asFiniteInt(raw.outcomeIdx, "outcomeIdx"),
    sharesAtomic: raw.sharesIn,
    tokensAtomic: raw.tokensOut,
    shares,
    tokens,
    averageExecutionPrice: tokens / shares,
    timestampMs: asFiniteInt(raw.timestamp_, "timestamp") * 1000,
    blockNumber: asFiniteInt(raw.block_number, "block number"),
    transactionHash: raw.transactionHash_,
  };
}

export function normalizeSettled(raw: RawSettled): MarketResolution | null {
  const marketId = asAddress(raw.marketProxy);
  if (!marketId || raw.winningOutcomeIdx === null) return null;
  return {
    schemaVersion: "0-1.history.resolution.v1",
    id: raw.id,
    marketId,
    status: "SETTLED",
    winningOutcomeIndex: asFiniteInt(raw.winningOutcomeIdx, "winningOutcomeIdx"),
    timestampMs: asFiniteInt(raw.timestamp_, "timestamp") * 1000,
    blockNumber: asFiniteInt(raw.block_number, "block number"),
    transactionHash: raw.transactionHash_,
  };
}

export function normalizeFailed(raw: RawFailed): MarketResolution | null {
  const marketId = asAddress(raw.marketProxy);
  if (!marketId) return null;
  return {
    schemaVersion: "0-1.history.resolution.v1",
    id: raw.id,
    marketId,
    status: "FAILED",
    winningOutcomeIndex: null,
    timestampMs: asFiniteInt(raw.timestamp_, "timestamp") * 1000,
    blockNumber: asFiniteInt(raw.block_number, "block number"),
    transactionHash: raw.transactionHash_,
  };
}

export function sortTradesChronologically(trades: HistoricalTrade[]): HistoricalTrade[] {
  return [...trades].sort((a, b) =>
    a.timestampMs - b.timestampMs ||
    a.blockNumber - b.blockNumber ||
    a.transactionHash.localeCompare(b.transactionHash) ||
    a.id.localeCompare(b.id),
  );
}

export function dedupeById<T extends { id: string }>(records: T[]): T[] {
  const byId = new Map<string, T>();
  for (const record of records) byId.set(record.id, record);
  return [...byId.values()];
}
