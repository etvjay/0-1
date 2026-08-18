import { competitionScope, delphi } from "../delphi/client.js";
import { routeMarket } from "../forecast/router.js";
import { evaluateEvidenceCouncil, defaultEvidenceCouncilPolicy } from "../forecast/evidence/council.js";
import { runAutonomousResearch } from "../forecast/research/orchestrator.js";
import { TavilySearchProvider } from "../forecast/research/tavily.js";
import { OpenAIOpinionProvider } from "../forecast/research/openai-opinion.js";
import { appendJsonl, sha256Json, writeJsonAtomic } from "../history/io.js";
import type { ForecastRecord } from "../history/types.js";

const marketArg = process.argv[2];
const outcomeArg = process.argv[3] ?? "0";
if (!marketArg) {
  console.error("Usage: npm run research:market -- <market-address> [outcome-index]");
  process.exit(1);
}

const marketId = marketArg.toLowerCase() as `0x${string}`;
const outcomeIndex = Number(outcomeArg);
const market = await delphi.getMarket({ id: marketId, pricesAndImpliedProbabilities: true, ...competitionScope });
const probabilities = market.spotImpliedProbabilities ?? [];
const marketProbability = probabilities[outcomeIndex];
if (marketProbability === undefined) throw new Error(`No live implied probability for outcome ${outcomeIndex}`);

const routing = routeMarket({
  marketId,
  question: market.metadata?.question ?? marketId,
  outcomes: market.metadata?.outcomes ?? [],
  category: market.category,
  resolvesAt: market.resolvesAt,
  settlesAt: market.settlesAt,
  dataSources: market.dataSources,
});

const research = await runAutonomousResearch(
  { routing, outcomeIndex, marketProbability },
  new TavilySearchProvider(),
  new OpenAIOpinionProvider(),
);
const council = evaluateEvidenceCouncil(research.bundle, defaultEvidenceCouncilPolicy);
const packetPath = `data/research/${marketId}-${outcomeIndex}-${research.packet.generatedAtMs}.json`;
await writeJsonAtomic(packetPath, { packet: research.packet, bundle: research.bundle, council });

if (council.status === "FORECAST") {
  const base = {
    schemaVersion: "0-1.forecast.v1" as const,
    marketId,
    outcomeIndex,
    probability: council.probability,
    confidence: council.confidence,
    marketProbability,
    method: council.method,
    createdAtMs: council.generatedAtMs,
  };
  const record: ForecastRecord = { id: sha256Json(base), ...base };
  await appendJsonl(process.env.ZERO_ONE_FORECAST_LOG ?? "data/forecasts.jsonl", record);
}

console.log(JSON.stringify({ packetPath, routing, council }, null, 2));
