import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { readJson, writeJsonAtomic } from "../history/io.js";

export interface RecentTradeState {
  executedAtMs: number;
  transactionHash: string;
}

export interface RuntimeState {
  schemaVersion: "0-1.runtime-state.v1";
  updatedAtMs: number;
  cyclesCompleted: number;
  totalTrades: number;
  consecutiveFailures: number;
  lastCycleStartedAtMs: number | null;
  lastCycleFinishedAtMs: number | null;
  lastTradeAtMs: number | null;
  lastTransactionHash: string | null;
  recentTrades: Record<string, RecentTradeState>;
}

export const defaultRuntimeState = (): RuntimeState => ({
  schemaVersion: "0-1.runtime-state.v1",
  updatedAtMs: Date.now(),
  cyclesCompleted: 0,
  totalTrades: 0,
  consecutiveFailures: 0,
  lastCycleStartedAtMs: null,
  lastCycleFinishedAtMs: null,
  lastTradeAtMs: null,
  lastTransactionHash: null,
  recentTrades: {},
});

export async function loadRuntimeState(path: string): Promise<RuntimeState> {
  try {
    const parsed = await readJson<RuntimeState>(path);
    if (parsed.schemaVersion !== "0-1.runtime-state.v1") throw new Error("Unsupported runtime state schema");
    return parsed;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return defaultRuntimeState();
    throw error;
  }
}

export async function saveRuntimeState(path: string, state: RuntimeState): Promise<void> {
  state.updatedAtMs = Date.now();
  await writeJsonAtomic(path, state);
}

export const opportunityKey = (marketId: string, outcomeIndex: number): string => `${marketId.toLowerCase()}:${outcomeIndex}`;

export function recentlyTraded(
  state: RuntimeState,
  marketId: string,
  outcomeIndex: number,
  cooldownMs: number,
  nowMs = Date.now(),
): boolean {
  const prior = state.recentTrades[opportunityKey(marketId, outcomeIndex)];
  return Boolean(prior && nowMs - prior.executedAtMs < cooldownMs);
}

export function recordTrade(
  state: RuntimeState,
  marketId: string,
  outcomeIndex: number,
  transactionHash: string,
  executedAtMs = Date.now(),
): void {
  state.totalTrades += 1;
  state.lastTradeAtMs = executedAtMs;
  state.lastTransactionHash = transactionHash;
  state.recentTrades[opportunityKey(marketId, outcomeIndex)] = { executedAtMs, transactionHash };
}

export function pruneRecentTrades(state: RuntimeState, retentionMs: number, nowMs = Date.now()): void {
  for (const [key, trade] of Object.entries(state.recentTrades)) {
    if (nowMs - trade.executedAtMs > retentionMs) delete state.recentTrades[key];
  }
}

export async function acquireRuntimeLock(path: string): Promise<() => Promise<void>> {
  await mkdir(dirname(path), { recursive: true });
  try {
    const handle = await open(path, "wx");
    await handle.writeFile(`${process.pid}\n`, "utf8");
    await handle.close();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "EEXIST") throw error;

    const rawPid = await readFile(path, "utf8").catch(() => "");
    const pid = Number(rawPid.trim());
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        throw new Error(`Another 0-1 runtime is already active with PID ${pid}.`);
      } catch (probeError) {
        const probe = probeError as NodeJS.ErrnoException;
        if (probe.code !== "ESRCH") throw probeError;
      }
    }

    await unlink(path).catch(() => undefined);
    const handle = await open(path, "wx");
    await handle.writeFile(`${process.pid}\n`, "utf8");
    await handle.close();
  }

  return async () => {
    await unlink(path).catch(() => undefined);
  };
}
