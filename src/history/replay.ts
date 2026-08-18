import type { HexAddress } from "../domain/types.js";
import type { CompetitionHistorySnapshot, ReplayView } from "./types.js";

export class ReplayClock {
  private readonly history: CompetitionHistorySnapshot;

  constructor(history: CompetitionHistorySnapshot) {
    this.history = history;
  }

  at(marketId: HexAddress, cutoffMs: number): ReplayView {
    if (!Number.isFinite(cutoffMs) || cutoffMs < 0) throw new Error("Replay cutoff must be a non-negative finite timestamp");
    const normalized = marketId.toLowerCase() as HexAddress;
    const market = this.history.markets.find((entry) => entry.marketId === normalized);
    if (!market) throw new Error(`Unknown market ${marketId}`);
    if (cutoffMs < market.createdAtMs) throw new Error(`Replay cutoff predates market creation for ${marketId}`);

    const trades = this.history.trades.filter(
      (trade) => trade.marketId === normalized && trade.timestampMs <= cutoffMs,
    );

    const resolution = this.history.resolutions
      .filter((entry) => entry.marketId === normalized && entry.timestampMs <= cutoffMs)
      .sort((a, b) => b.timestampMs - a.timestampMs || b.blockNumber - a.blockNumber)[0] ?? null;

    return {
      cutoffMs,
      market: {
        marketId: market.marketId,
        question: market.question,
        outcomes: [...market.outcomes],
        category: market.category,
        createdAtMs: market.createdAtMs,
      },
      trades,
      resolution,
    };
  }
}
