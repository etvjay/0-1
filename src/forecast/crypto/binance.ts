import type { ReferencePrice } from "./types.js";

const BASE_URL = process.env.ZERO_ONE_BINANCE_BASE_URL ?? "https://fapi.binance.com";

interface BookTickerResponse {
  symbol: string;
  bidPrice: string;
  askPrice: string;
}

type Kline = [number, string, string, string, string, string, number, string, number, string, string, string];

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "user-agent": "0-1-delphi-agent/0.1" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Binance ${response.status} ${response.statusText} for ${path}`);
  return await response.json() as T;
}

export async function fetchReferencePrice(symbol: string): Promise<ReferencePrice> {
  const normalized = symbol.toUpperCase();
  const result = await getJson<BookTickerResponse>(`/fapi/v1/ticker/bookTicker?symbol=${encodeURIComponent(normalized)}`);
  const bid = Number(result.bidPrice);
  const ask = Number(result.askPrice);
  if (![bid, ask].every(Number.isFinite) || bid <= 0 || ask <= 0 || ask < bid) {
    throw new Error(`Invalid Binance book ticker for ${normalized}`);
  }
  return {
    symbol: normalized,
    bid,
    ask,
    mid: (bid + ask) / 2,
    observedAtMs: Date.now(),
  };
}

export async function fetchMinuteCloses(symbol: string, limit = 241): Promise<number[]> {
  const normalized = symbol.toUpperCase();
  const bounded = Math.min(1_000, Math.max(31, Math.floor(limit)));
  const rows = await getJson<Kline[]>(`/fapi/v1/klines?symbol=${encodeURIComponent(normalized)}&interval=1m&limit=${bounded}`);
  const closes = rows.map((row) => Number(row[4])).filter((value) => Number.isFinite(value) && value > 0);
  if (closes.length < 31) throw new Error(`Insufficient Binance minute closes for ${normalized}: ${closes.length}`);
  return closes;
}
