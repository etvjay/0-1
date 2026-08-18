import { acquireRuntimeLock } from "../runtime/state.js";
import { runCompeteCycle } from "../runtime/compete-cycle.js";

const numberEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number`);
  return value;
};

const intervalMs = numberEnv("ZERO_ONE_CYCLE_INTERVAL_MS", 180_000);
const failureBackoffMs = numberEnv("ZERO_ONE_FAILURE_BACKOFF_MS", 30_000);
const lockPath = process.env.ZERO_ONE_RUNTIME_LOCK ?? "data/runtime/compete.lock";
const release = await acquireRuntimeLock(lockPath);
let stopping = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stop = () => { stopping = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

try {
  while (!stopping) {
    try {
      const result = await runCompeteCycle();
      console.log(JSON.stringify({ type: "cycle", at: new Date().toISOString(), ...result }));
      if (!stopping) await sleep(intervalMs);
    } catch (error) {
      console.error(JSON.stringify({
        type: "cycle_error",
        at: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }));
      if (!stopping) await sleep(failureBackoffMs);
    }
  }
} finally {
  await release();
}
