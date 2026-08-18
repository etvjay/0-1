import { competitionScope, delphi } from "../delphi/client.js";
import { routeMarket } from "../forecast/router.js";

const marketArg = process.argv[2];
if (!marketArg) {
  console.error("Usage: npm run route:market -- <market-address>");
  process.exit(1);
}

const marketId = marketArg.toLowerCase() as `0x${string}`;
const market = await delphi.getMarket({ id: marketId, pricesAndImpliedProbabilities: true, ...competitionScope });

const routing = routeMarket({
  marketId,
  question: market.metadata?.question ?? marketId,
  outcomes: market.metadata?.outcomes ?? [],
  category: market.category,
  resolvesAt: market.resolvesAt,
  settlesAt: market.settlesAt,
  dataSources: market.dataSources,
});

console.log(JSON.stringify({
  market: {
    id: marketId,
    category: market.category,
    status: market.status,
    question: market.metadata?.question ?? marketId,
    outcomes: market.metadata?.outcomes ?? [],
    probabilities: market.spotImpliedProbabilities ?? [],
  },
  routing,
}, null, 2));
