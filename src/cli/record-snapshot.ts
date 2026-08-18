import type { HexAddress } from "../domain/types.js";
import { competitionScope, delphi } from "../delphi/client.js";
import { appendJsonl, sha256Json } from "../history/io.js";
import type { RecordedMarketSnapshot } from "../history/types.js";

const marketArg = process.argv[2];
const output = process.argv[3] ?? "data/observations/markets.jsonl";
if (!marketArg) {
  console.error("Usage: npm run record:snapshot -- <market-address> [output-jsonl]");
  process.exit(1);
}

const marketId = marketArg.toLowerCase() as HexAddress;
const market = await delphi.getMarket({
  id: marketId,
  pricesAndImpliedProbabilities: true,
  ...competitionScope,
});

const record: RecordedMarketSnapshot = {
  schemaVersion: "0-1.market-observation.v1",
  observedAtMs: Date.now(),
  marketId,
  question: market.metadata?.question ?? marketId,
  outcomes: market.metadata?.outcomes ?? [],
  probabilities: market.spotImpliedProbabilities ?? [],
  status: market.status,
};

await appendJsonl(output, record);
console.log(JSON.stringify({ output, evidenceHash: sha256Json(record), record }, null, 2));
