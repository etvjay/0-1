import { delphi, getWalletAddress } from "./client.js";

export interface SettlementSweepResult {
  observedAtMs: number;
  redeemedMarkets: string[];
  liquidatedMarkets: string[];
  transactions: string[];
  failures: Array<{ marketId: string; action: "REDEEM" | "LIQUIDATE"; error: string }>;
}

export async function sweepSettledPositions(): Promise<SettlementSweepResult> {
  const wallet = await getWalletAddress();
  const { positions } = await delphi.listPositions({ wallet, redeemedOrLiquidated: false, limit: 500 });
  const active = positions ?? [];

  const settledMarkets = [...new Set(
    active
      .filter((position) => String(position.marketStatus ?? "").toLowerCase() === "settled")
      .map((position) => String(position.marketProxy).toLowerCase()),
  )] as `0x${string}`[];

  const liquidatableMarkets = [...new Set(
    active
      .filter((position) => {
        const status = String(position.marketStatus ?? "").toLowerCase();
        return status === "expired" || status === "failed";
      })
      .map((position) => String(position.marketProxy).toLowerCase()),
  )] as `0x${string}`[];

  const result: SettlementSweepResult = {
    observedAtMs: Date.now(),
    redeemedMarkets: [],
    liquidatedMarkets: [],
    transactions: [],
    failures: [],
  };

  if (settledMarkets.length > 0) {
    try {
      const redeemed = await delphi.redeemPositions({ marketAddresses: settledMarkets });
      for (const item of redeemed.results) {
        if (item.success) {
          result.redeemedMarkets.push(String(item.marketAddress).toLowerCase());
        } else {
          result.failures.push({
            marketId: String(item.marketAddress).toLowerCase(),
            action: "REDEEM",
            error: item.error ?? "Unknown redemption error",
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const marketId of settledMarkets) result.failures.push({ marketId, action: "REDEEM", error: message });
    }
  }

  for (const marketId of liquidatableMarkets) {
    const outcomeIndices = [...new Set(
      active
        .filter((position) => String(position.marketProxy).toLowerCase() === marketId)
        .map((position) => Number(position.outcomeIdx)),
    )];
    if (outcomeIndices.length === 0) continue;
    try {
      const liquidation = await delphi.liquidate({ marketAddress: marketId, outcomeIndices });
      result.liquidatedMarkets.push(marketId);
      if (liquidation.transactionHash) result.transactions.push(liquidation.transactionHash);
    } catch (error) {
      result.failures.push({
        marketId,
        action: "LIQUIDATE",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
