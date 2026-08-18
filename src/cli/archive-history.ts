import { ingestCompetitionHistory } from "../history/subgraph.js";
import { sha256Json, writeJsonAtomic } from "../history/io.js";

const output = process.argv[2] ?? "data/history/latest.json";
const history = await ingestCompetitionHistory();
const evidenceHash = sha256Json(history);

await writeJsonAtomic(output, history);
console.log(JSON.stringify({
  output,
  evidenceHash,
  generatedAtMs: history.generatedAtMs,
  indexedBlock: history.subgraph.blockNumber,
  markets: history.markets.length,
  trades: history.trades.length,
  resolutions: history.resolutions.length,
}, null, 2));
