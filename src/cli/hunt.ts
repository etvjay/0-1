import { createResearchProviders } from "../forecast/research/providers.js";
import { huntOpportunities } from "../hunt/orchestrator.js";
import { writeJsonAtomic } from "../history/io.js";

const marketLimit = Number(process.argv[2] ?? process.env.ZERO_ONE_HUNT_MARKET_LIMIT ?? 100);
const researchBudget = Number(process.argv[3] ?? process.env.ZERO_ONE_HUNT_RESEARCH_BUDGET ?? 8);
const accountValue = Number(process.argv[4] ?? process.env.ZERO_ONE_HUNT_ACCOUNT_VALUE ?? 100);
const marketExposure = Number(process.argv[5] ?? process.env.ZERO_ONE_HUNT_MARKET_EXPOSURE ?? 0);
const maxPriorDrift = Number(process.env.ZERO_ONE_HUNT_MAX_PRIOR_DRIFT ?? 0.08);

if (![marketLimit, researchBudget, accountValue, marketExposure, maxPriorDrift].every(Number.isFinite)) {
  throw new Error("Hunter numeric configuration contains a non-finite value.");
}

const providers = createResearchProviders();
const report = await huntOpportunities(
  providers.search,
  providers.opinion,
  {
    marketLimit: Math.max(1, Math.floor(marketLimit)),
    researchBudget: Math.max(0, Math.floor(researchBudget)),
    accountValue,
    marketExposure,
    maxPriorDrift,
  },
);

const output = `data/hunt/reports/${report.generatedAtMs}.json`;
await writeJsonAtomic(output, report);

console.log(JSON.stringify({
  output,
  searchProvider: providers.search.name,
  opinionProvider: providers.opinion.name,
  generatedAtMs: report.generatedAtMs,
  openMarkets: report.openMarkets,
  triageCandidates: report.triageCandidates,
  researched: report.researched,
  actionable: report.actionable,
  opportunities: report.results.slice(0, 10).map((result) => ({
    marketId: result.candidate.marketId,
    question: result.candidate.question,
    researchedOutcome: result.candidate.outcome,
    triageScore: result.candidate.triageScore,
    status: result.status,
    priorDrift: result.priorDrift,
    bestSide: result.bestSide ? {
      outcomeIndex: result.bestSide.side.outcomeIndex,
      outcome: result.bestSide.side.outcome,
      ourProbability: result.bestSide.side.probability,
      marketProbability: result.bestSide.side.marketProbability,
      opportunityScore: result.bestSide.opportunityScore,
      proposal: result.bestSide.bestProposal,
    } : null,
    reason: result.reason,
  })),
}, null, 2));
