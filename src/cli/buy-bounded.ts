import { executeBoundedBuy } from "../execution/live-buy.js";

const [marketArg, outcomeArg, sharesArg, probabilityArg, confidenceArg, accountValueArg, exposureArg] = process.argv.slice(2);
if (!marketArg || outcomeArg === undefined || sharesArg === undefined || probabilityArg === undefined || confidenceArg === undefined) {
  console.error("Usage: npm run buy:bounded -- <market> <outcome-index> <shares> <our-probability> <confidence> [account-value] [market-exposure]");
  process.exit(1);
}

const receipt = await executeBoundedBuy({
  marketId: marketArg.toLowerCase() as `0x${string}`,
  outcomeIndex: Number(outcomeArg),
  shares: Number(sharesArg),
  probability: Number(probabilityArg),
  confidence: Number(confidenceArg),
  accountValue: Number(accountValueArg ?? 100),
  marketExposure: Number(exposureArg ?? 0),
  method: "manual-bounded-buy-v1",
});

console.log(JSON.stringify(receipt, null, 2));
