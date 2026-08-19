import type { SubgraphBuy, SubgraphSell } from "@gensyn-ai/gensyn-delphi-sdk";
import type { HexAddress } from "../domain/types.js";
import { competitionId, competitionScope, delphi } from "../delphi/client.js";
import { dedupeById, normalizeBuy, normalizeFailed, normalizeSell, normalizeSettled, sortTradesChronologically } from "./normalize.js";
import type { CompetitionHistorySnapshot, HistoricalTrade, MarketCatalogRecord, MarketResolution } from "./types.js";

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

async function allPages<T>(fetchPage: (first: number, skip: number) => Promise<T[]>, pageSize = 500, maxRecords = 100_000): Promise<T[]> {
  const all: T[] = [];
  for (let skip = 0; skip < maxRecords; skip += pageSize) {
    const page = await fetchPage(pageSize, skip);
    all.push(...page);
    if (page.length < pageSize) return all;
  }
  throw new Error(`Pagination safety ceiling reached (${maxRecords} records)`);
}

async function listCatalog(): Promise<MarketCatalogRecord[]> {
  const statuses = ["open", "awaiting_settlement", "settled", "expired", "failed"] as const;
  const records = new Map<string, MarketCatalogRecord>();

  for (const status of statuses) {
    let skip = 0;
    const limit = 100;
    while (true) {
      const response = await delphi.listMarkets({ status, limit, skip, ...competitionScope });
      const markets = response.markets ?? [];
      for (const market of markets) {
        const marketId = market.id.toLowerCase() as HexAddress;
        records.set(marketId, {
          schemaVersion: "0-1.history.market.v1",
          marketId,
          question: market.metadata?.question ?? marketId,
          outcomes: market.metadata?.outcomes ?? [],
          category: market.category ?? null,
          currentStatus: market.status,
          createdAtMs: new Date(market.createdAt).getTime(),
          settledAtMs: market.settledAt ? new Date(market.settledAt).getTime() : null,
        });
      }
      if (markets.length < limit) break;
      skip += limit;
      if (skip >= 10_000) throw new Error(`Market pagination safety ceiling reached for status=${status}`);
    }
  }

  return [...records.values()].sort((a, b) => a.createdAtMs - b.createdAtMs || a.marketId.localeCompare(b.marketId));
}

export async function ingestCompetitionHistory(): Promise<CompetitionHistorySnapshot> {
  const subgraph = delphi.getSubgraph();
  const meta = await subgraph.getMeta();

  if (meta.hasIndexingErrors) {
    throw new Error("Delphi competition subgraph reports indexing errors; refusing to freeze a history snapshot");
  }

  const buys = await allPages(async (first, skip) => {
    const result = await subgraph.query<{ gatewayBuys: SubgraphBuy[] }>(`
      query Buys($first: Int!, $skip: Int!) {
        gatewayBuys(first: $first, skip: $skip, orderBy: timestamp_, orderDirection: asc) {
          id block_number timestamp_ transactionHash_ contractId_ marketProxy buyer outcomeIdx tokensIn sharesOut
        }
      }
    `, { first, skip });
    return result.gatewayBuys;
  });

  const sells = await allPages(async (first, skip) => {
    const result = await subgraph.query<{ gatewaySells: SubgraphSell[] }>(`
      query Sells($first: Int!, $skip: Int!) {
        gatewaySells(first: $first, skip: $skip, orderBy: timestamp_, orderDirection: asc) {
          id block_number timestamp_ transactionHash_ contractId_ marketProxy seller outcomeIdx sharesIn tokensOut
        }
      }
    `, { first, skip });
    return result.gatewaySells;
  });

  const settled = await allPages(async (first, skip) => {
    const result = await subgraph.query<{ gatewayMarketSettleds: RawSettled[] }>(`
      query Settled($first: Int!, $skip: Int!) {
        gatewayMarketSettleds(first: $first, skip: $skip, orderBy: timestamp_, orderDirection: asc) {
          id block_number timestamp_ transactionHash_ marketProxy winningOutcomeIdx
        }
      }
    `, { first, skip });
    return result.gatewayMarketSettleds;
  });

  const failed = await allPages(async (first, skip) => {
    const result = await subgraph.query<{ gatewayMarketFaileds: RawFailed[] }>(`
      query Failed($first: Int!, $skip: Int!) {
        gatewayMarketFaileds(first: $first, skip: $skip, orderBy: timestamp_, orderDirection: asc) {
          id block_number timestamp_ transactionHash_ marketProxy
        }
      }
    `, { first, skip });
    return result.gatewayMarketFaileds;
  });

  const trades = sortTradesChronologically(dedupeById([
    ...buys.map(normalizeBuy).filter((value): value is HistoricalTrade => value !== null),
    ...sells.map(normalizeSell).filter((value): value is HistoricalTrade => value !== null),
  ]));

  const resolutions: MarketResolution[] = dedupeById([
    ...settled.map(normalizeSettled).filter((value): value is MarketResolution => value !== null),
    ...failed.map(normalizeFailed).filter((value): value is MarketResolution => value !== null),
  ]).sort((a, b) => a.timestampMs - b.timestampMs || a.blockNumber - b.blockNumber || a.id.localeCompare(b.id));

  return {
    schemaVersion: "0-1.history.snapshot.v1",
    competitionId: competitionId ?? null,
    generatedAtMs: Date.now(),
    subgraph: {
      blockNumber: meta.block.number,
      blockTimestamp: meta.block.timestamp,
      blockHash: meta.block.hash,
      deployment: meta.deployment,
      hasIndexingErrors: meta.hasIndexingErrors,
    },
    markets: await listCatalog(),
    trades,
    resolutions,
  };
}
