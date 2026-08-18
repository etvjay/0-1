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
  lastCycleStartedAtMs