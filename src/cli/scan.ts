import { quoteSizes } from "../config.js";
import type { HexAddress } from "../domain/types.js";
import { competitionScope, delphi } from "../delphi/client.js";
import { quoteLadder } from "../delphi/quotes.js";

const limit = Number(process.argv[2] ?? 25);
const { markets } = await delphi.listMarkets({
  status: "open",
  limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
  ...competitionScope,
});

console.log(JSON.stringify({
  network: "competition-testnet",
  competitionId: process.env.DELPHI_COMPETITION_ID || "ACTIVE",
  openMarkets: markets.length,
  scannedAt: new Date().toISOString(),
}, null, 2));

for (const market of markets) {
  const marketId = market.id as HexAddress;
  const detail = await delphi.getMarket({
    id: marketId,
    pricesAndImpliedProbabilities: true,
    ...competitionScope,
  });

  const question = detail.metadata?.question ?? marketId;
  const outcomes: string[] = detail.metadata?.outcomes ?? [];
  const probabilities: number[] = detail.spotImpliedProbabilities ?? [];

  console.log(`\n${question}`);
  console.log(`market: ${marketId}`);

  for (let outcomeIndex = 0; outcomeIndex < outcomes.length; outcomeIndex++) {
    const probability = probabilities[outcomeIndex];
    const outcome = outcomes[outcomeIndex] ?? `#${outcomeIndex}`;
    console.log(`  [${outcomeIndex}] ${outcome}  marketP=${probability === undefined ? "—" : probability.toFixed(4)}`);

    const ladder = await quoteLadder(marketId, outcomeIndex, quoteSizes);
    for (const quote of ladder) {
      if ("error" in quote) {
        console.log(`      ${quote.shares.toFixed(4)} shares -> QUOTE_FAILED ${quote.error.slice(0, 100)}`);
      } else {
        const impact = probability === undefined ? undefined : quote.averagePrice - probability;
        console.log(
          `      ${quote.shares.toFixed(4)} shares -> cost=${quote.tokensIn.toFixed(6)} TST avg=${quote.averagePrice.toFixed(4)}` +
          `${impact === undefined ? "" : ` impact=${impact >= 0 ? "+" : ""}${impact.toFixed(4)}`}`,
        );
      }
    }
  }
}
