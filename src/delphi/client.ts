import "dotenv/config";
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

const network = process.env.DELPHI_NETWORK ?? "competition-testnet";
if (network !== "competition-testnet") {
  throw new Error(`0-1 v0 is competition-only; DELPHI_NETWORK must be competition-testnet, got ${network}`);
}

export const delphi = new DelphiClient({ network: "competition-testnet" });

export const competitionId = process.env.DELPHI_COMPETITION_ID || undefined;
export const competitionScope = competitionId ? { competitionId } : {};

export const sharesToBigint = (shares: number) => BigInt(Math.round(shares * 1e18));
export const collateralToNumber = (tokens: bigint) => Number(tokens) / 1e6;
