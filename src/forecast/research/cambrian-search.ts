import { sha256Json } from "../../history/io.js";
import type { SearchProvider, SearchRequest, SearchResultRecord } from "./types.js";

type CambrianNetwork = "solana" | "evm";
interface CambrianTokenConfig { network: CambrianNetwork; address: string; }
type CambrianTokenMap = Record<string, CambrianTokenConfig>;

const parseTokenMap = (raw: string): CambrianTokenMap => {
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const result: CambrianTokenMap = {};
  for (const [symbol, value] of Object.entries(parsed)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    if ((entry.network !== "solana" && entry.network !== "evm") || typeof entry.address !== "string" || !entry.address) continue;
    result[symbol.toUpperCase()] = { network: entry.network, address: entry.address };
  }
  return result;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findConfiguredAsset = (question: string, tokenMap: CambrianTokenMap): [string, CambrianTokenConfig] | null => {
  for (const [symbol, config] of Object.entries(tokenMap)) {
    if (new RegExp(`\\b${escapeRegExp(symbol)}\\b`, "i").test(question)) return [symbol, config];
  }
  return null;
};

const fetchJson = async (url: string, apiKey: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Cambrian request failed: ${response.status} ${await response.text()}`);
  return response.json();
};

export class CambrianCryptoSearchProvider implements SearchProvider {
  readonly name = "cambrian-crypto-v1";
  private readonly tokenMap: CambrianTokenMap;

  constructor(
    private readonly apiKey = process.env.CAMBRIAN_API_KEY ?? "",
    private readonly baseUrl = process.env.CAMBRIAN_BASE_URL ?? "https://opabinia.cambrian.network/api/v1",
    tokenMapJson = process.env.ZERO_ONE_CAMBRIAN_TOKEN_MAP ?? "{}",
  ) {
    if (!apiKey) throw new Error("CAMBRIAN_API_KEY is required for Cambrian evidence");
    this.tokenMap = parseTokenMap(tokenMapJson);
  }

  async search({ query }: SearchRequest): Promise<SearchResultRecord[]> {
    const match = findConfiguredAsset(query.query, this.tokenMap);
    if (!match) return [];
    const [symbol, config] = match;
    const observedAtMs = Date.now();
    const endpointBase = this.baseUrl.replace(/\/$/, "");
    const calls: Array<{ title: string; url: string }> = [];

    if (config.network === "solana") {
      calls.push({
        title: `Cambrian ${symbol} current on-chain USD price`,
        url: `${endpointBase}/solana/price-current?token_address=${encodeURIComponent(config.address)}`,
      });
      calls.push({
        title: `Cambrian ${symbol} 24h on-chain trade statistics`,
        url: `${endpointBase}/solana/trade-statistics?token_addresses=${encodeURIComponent(config.address)}&timeframe=24h`,
      });
    } else {
      calls.push({
        title: `Cambrian ${symbol} current on-chain USD price`,
        url: `${endpointBase}/evm/price-current?token_address=${encodeURIComponent(config.address)}`,
      });
    }

    const settled = await Promise.allSettled(calls.map(async (call) => ({ ...call, payload: await fetchJson(call.url, this.apiKey) })));
    return settled.flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      const value = result.value;
      const base = {
        queryId: query.id,
        queryIntent: query.intent,
        provider: this.name,
        title: value.title,
        url: value.url,
        content: JSON.stringify(value.payload),
        score: 1,
        publishedAtMs: null,
        observedAtMs,
      };
      return [{ schemaVersion: "0-1.search-result.v1" as const, id: sha256Json(base), ...base }];
    });
  }
}
