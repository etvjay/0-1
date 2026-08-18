import type { HexAddress, QuoteObservation } from "../domain/types.js";
import { collateralToNumber, delphi, sharesToBigint } from "./client.js";

export async function quoteBuy(
  marketId: HexAddress,
  outcomeIndex: number,
  shares: number,
): Promise<QuoteObservation> {
  const quotedAt = Date.now();
  const { tokensIn } = await delphi.quoteBuy({
    marketAddress: marketId,
    outcomeIdx: outcomeIndex,
    sharesOut: sharesToBigint(shares),
  });

  const tokens = collateralToNumber(tokensIn);
  return {
    shares,
    tokensIn: tokens,
    averagePrice: tokens / shares,
    quotedAt,
  };
}

export async function quoteLadder(
  marketId: HexAddress,
  outcomeIndex: number,
  sizes: number[],
): Promise<Array<QuoteObservation | { shares: number; error: string }>> {
  const results: Array<QuoteObservation | { shares: number; error: string }> = [];
  for (const shares of sizes) {
    try {
      results.push(await quoteBuy(marketId, outcomeIndex, shares));
    } catch (error) {
      results.push({ shares, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}
