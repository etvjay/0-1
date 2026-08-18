import type { HexAddress } from "../domain/types.js";
import { readJson } from "../history/io.js";
import { ReplayClock } from "../history/replay.js";
import type { CompetitionHistorySnapshot } from "../history/types.js";

const [, , historyPath = "data/history/latest.json", marketArg, cutoffArg] = process.argv;
if (!marketArg || !cutoffArg) {
  console.error("Usage: npm run replay -- [history-json] <market-address> <cutoff-iso-or-ms>");
  process.exit(1);
}

const numericCutoff = Number(cutoffArg);
const cutoffMs = Number.isFinite(numericCutoff) ? numericCutoff : new Date(cutoffArg).getTime();
if (!Number.isFinite(cutoffMs)) throw new Error(`Invalid replay cutoff: ${cutoffArg}`);

const history = await readJson<CompetitionHistorySnapshot>(historyPath);
const view = new ReplayClock(history).at(marketArg.toLowerCase() as HexAddress, cutoffMs);
console.log(JSON.stringify(view, null, 2));
