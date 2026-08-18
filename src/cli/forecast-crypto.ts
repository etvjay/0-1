import { quoteSizes, tradePolicy } from "../config.js";
import { evaluateTrade } from "../domain/evaluate.js";
import type { PortfolioState } from "../domain/types.js";
import { competitionScope, delphi } from "../delphi/client.js";
import { quoteLadder } from "../delphi/quotes.js";
import { forecastCryptoThresholdMarket, persistCryptoForecast } from "../forecast/crypto/forecaster.js";

const [, , marketArg, accountValueArg = "100", exposureArg = "0"] = process.argv;
if (!marketArg) {
  console.error("Usage: npm run forecast:crypto -- <market-address> [account-value] [market-exposure]");
  process.exit(1);
}

const marketId = marketArg.toLowerCase() as `0x${string}`;
const accountValue = Number(accountValueArg);
const marketExposure = Number(exposureArg);
if (![accountValue, marketExposure].every(Number.isFinite)) throw new Error("Portfolio arguments must be finite");

const market = await delphi.getMarket({
  id: marketId,
  pricesAndImpliedProbabilities: true,
  ...competitionScope,
});
const question = market.metadata?.question ?? marketId;
const outcomes = market.metadata?.outcomes ?? [];
const probabilities = market.spotImpliedProbabilities ?? [];
const resolutionRaw = market.resolvesAt ?? market.settlesAt;
if (!resolutionRaw) throw new Error("Market has no resolution/settlement timestamp");
const resolvesAtMs = new Date(resolutionRaw).getTime();

const { forecast, snapshot, belief, record } = await forecastCryptoThresholdMarket({
  marketId,
  question,
  outcomes,
  marketProbabilities: probabilities,
  resolvesAtMs,
});
await persistCryptoForecast(record);

const portfolio: PortfolioState = { accountValue, marketExposure };
const ladder = await quoteLadder(marketId, snapshot.outcomeIndex, quoteSizes);
const evaluations = ladder.map((item) => {
  if ("error" in item) return { shares: item.shares, status: "QUOTE_FAILED", error: item.error };
  return evaluateTrade(snapshot, belief, item, portfolio, tradePolicy, Date.now());
});

console.log(JSON.stringify({
  market: {
    marketId,
    question,
    outcomes,
    resolvesAt: new Date(resolvesAtMs).toISOString(),
  },
  forecast,
  belief,
  forecastRecord: record,
  portfolio,
  policy: tradePolicy,
  evaluations,
}, null, 2));
