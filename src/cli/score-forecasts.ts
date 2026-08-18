import { readJson, readJsonl } from "../history/io.js";
import { scoreForecasts } from "../history/metrics.js";
import type { CompetitionHistorySnapshot, ForecastRecord } from "../history/types.js";

const historyPath = process.argv[2] ?? "data/history/latest.json";
const forecastsPath = process.argv[3] ?? "data/forecasts.jsonl";

const history = await readJson<CompetitionHistorySnapshot>(historyPath);
const forecasts = await readJsonl<ForecastRecord>(forecastsPath);
const result = scoreForecasts(forecasts, history.resolutions);
console.log(JSON.stringify(result, null, 2));
