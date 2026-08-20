import { executeBoundedBuy } from "../execution/live-buy.js";

const [
  marketArg,
  outcomeArg,
  sharesArg,
  probabilityArg,
  confidenceArg,
  accountValueArg,
  exposureArg,
  beliefCreatedAtArg,
  beliefExpiresAtArg,
  methodArg,
] = process.argv.slice(2);

if (!marketArg || outcomeArg === undefined || sharesArg === undefined || probabilityArg === undefined || confidenceArg === undefined) {
  console.error(
    "Usage: npm run buy:bounded -- <market> <outcome-index> <shares> <our-probability> <confidence> " +
    "[account-value] [market-exposure] [belief-created-at-ms] [belief-expires-at-ms] [method]",
  );
  process.exit(1);
}

const optionalNumber = (value: string | undefined): number | undefined => {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected finite numeric argument, got ${value}`);
  return parsed;
};

const beliefCreatedAtMs = optionalNumber(beliefCreatedAtArg);
const beliefExpiresAtMs = optionalNumber(beliefExpiresAtArg);

const receipt = await executeBoundedBuy({
  marketId: marketArg.toLowerCase() as `0x${string}`,
  outcomeIndex: Number(outcomeArg),
  shares: Number(sharesArg),
  probability: Number(probabilityArg),
  confidence: Number(confidenceArg),
  accountValue: Number(accountValueArg ?? 100),
  marketExposure: Number(exposureArg ?? 0),
  ...(beliefCreatedAtMs !== undefined ? { beliefCreatedAtMs } : {}),
  ...(beliefExpiresAtMs !== undefined ? { beliefExpiresAtMs } : {}),
  method: methodArg ?? "manual-bounded-buy-v2",
});

console.log(JSON.stringify(receipt, null, 2));
