import { readJson, appendJsonl, sha256Json } from "../history/io.js";
import type { ForecastRecord } from "../history/types.js";
import { defaultEvidenceCouncilPolicy, evaluateEvidenceCouncil } from "../forecast/evidence/council.js";
import type { EvidenceForecastBundle } from "../forecast/evidence/types.js";

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error("Usage: npm run forecast:evidence -- <evidence-bundle.json> [forecast-log.jsonl]");
  process.exit(1);
}

const output = process.argv[3] ?? process.env.ZERO_ONE_FORECAST_LOG ?? "data/forecasts.jsonl";
const bundle = await readJson<EvidenceForecastBundle>(bundlePath);
const result = evaluateEvidenceCouncil(bundle, defaultEvidenceCouncilPolicy);

if (result.status === "FORECAST") {
  const forecastBase = {
    schemaVersion: "0-1.forecast.v1" as const,
    marketId: result.marketId,
    outcomeIndex: result.outcomeIndex,
    probability: result.probability,
    confidence: result.confidence,
    marketProbability: result.marketProbability,
    method: result.method,
    createdAtMs: result.generatedAtMs,
  };
  const record: ForecastRecord = { id: sha256Json(forecastBase), ...forecastBase };
  await appendJsonl(output, record);
  console.log(JSON.stringify({ bundlePath, output, result, forecast: record }, null, 2));
} else {
  console.log(JSON.stringify({ bundlePath, result }, null, 2));
  process.exitCode = 2;
}
