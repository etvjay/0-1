import { OpenAIOpinionProvider } from "../forecast/research/openai-opinion.js";
import { TavilySearchProvider } from "../forecast/research/tavily.js";
import { huntOpportunities } from "../hunt/orchestrator.js";
import { executeBoundedBuy } from "../execution/live-buy.js";

const marketLimit = Number(process.env.ZERO_ONE_HUNT_MARKET_LIMIT ?? 100);
const researchBudget = Number(process.env.ZERO_ONE_HUNT_RESEARCH_BUDGET ?? 8);
const accountValue = Number(process.env.ZERO_ONE_HUNT_ACCOUNT_VALUE ?? 100);
const marketExposure = Number(process.env.ZERO_ONE_HUNT_MARKET_EXPOSURE ?? 0);
const maxPriorDrift = Number(process.env.ZERO_ONE_HUNT_MAX_PRIOR_DRIFT ?? 0.08);
const live = (process.env.ZERO_ONE_LIVE_TRADING ?? "false").toLowerCase() === "true";

const report = await huntOpportunities(
  new TavilySearchProvider(),
  new OpenAIOpinionProvider(),
  { marketLimit, researchBudget, accountValue, marketExposure, maxPriorDrift },
);

const top = report.results.find((result) => result.status === "ACTIONABLE" && result.bestSide?.bestProposal);
if (!top || !top.bestSide?.bestProposal || !top.council || top.council.status !== "FORECAST") {
  console.log(JSON.stringify({ mode: live ? "LIVE" : "SHADOW", actionable: false, report }, null, 2));
  process.exit(0);
}

const proposal = top.bestSide.bestProposal;
const decision = {
  marketId: proposal.marketId,
  outcomeIndex: proposal.outcomeIndex,
  shares: proposal.shares,
  ourProbability: proposal.ourProbability,
  confidence: top.council.confidence,
  marketProbability: proposal.marketProbability,
  executionEdge: proposal.executionEdge,
  expectedValue: proposal.expectedValue,
  quotedCost: proposal.quotedCost,
};

if (!live) {
  console.log(JSON.stringify({ mode: "SHADOW", actionable: true, decision }, null, 2));
  process.exit(0);
}

const receipt = await executeBoundedBuy({
  marketId: proposal.marketId,
  outcomeIndex: proposal.outcomeIndex,
  shares: proposal.shares,
  probability: proposal.ourProbability,
  confidence: top.council.confidence,
  accountValue,
  marketExposure,
  beliefCreatedAtMs: top.council.generatedAtMs,
  beliefExpiresAtMs: top.council.expiresAtMs,
  method: top.council.method,
});

console.log(JSON.stringify({ mode: "LIVE", actionable: true, decision, receipt }, null, 2));
