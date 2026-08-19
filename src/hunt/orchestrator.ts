import { competitionScope, delphi } from "../delphi/client.js";
import { evaluateEvidenceCouncil, defaultEvidenceCouncilPolicy } from "../forecast/evidence/council.js";
import { runAutonomousResearch } from "../forecast/research/orchestrator.js";
import type { OpinionProvider, SearchProvider } from "../forecast/research/types.js";
import { appendJsonl, sha256Json, writeJsonAtomic } from "../history/io.js";
import type { ForecastRecord } from "../history/types.js";
import { evaluateForecastSide, forecastSides } from "./evaluate.js";
import { rankTriage, triageMarket } from "./triage.js";
import type { HuntCandidateResult, HuntReport, HunterMarketInput, TriageCandidate } from "./types.js";

const priorDrift = (oldP: number, newP: number) => Math.abs(oldP - newP);

export async function buildTriageUniverse(limit = 100): Promise<{ openMarkets: number; candidates: TriageCandidate[] }> {
  const allMarkets = [];
  let skip = 0;
  while (allMarkets.length < limit) {
    const pageSize = Math.min(100, limit - allMarkets.length);
    const response = await delphi.listMarkets({
      status: "open",
      skip,
      limit: pageSize,
      pricesAndImpliedProbabilities: true,
      ...competitionScope,
    });
    const markets = response.markets ?? [];
    allMarkets.push(...markets);
    if (markets.length < pageSize) break;
    skip += markets.length;
  }

  const now = Date.now();
  const candidates: TriageCandidate[] = [];
  for (const market of allMarkets) {
    let detail = market;
    if (!detail.spotImpliedProbabilities || detail.spotImpliedProbabilities.length === 0) {
      detail = await delphi.getMarket({ id: market.id, pricesAndImpliedProbabilities: true, ...competitionScope });
    }
    const input: HunterMarketInput = {
      marketId: detail.id.toLowerCase() as `0x${string}`,
      question: detail.metadata?.question ?? detail.id,
      outcomes: detail.metadata?.outcomes ?? [],
      category: detail.category,
      resolvesAt: detail.resolvesAt,
      settlesAt: detail.settlesAt,
      dataSources: detail.dataSources,
      probabilities: detail.spotImpliedProbabilities ?? [],
      observedAtMs: now,
    };
    candidates.push(...triageMarket(input, now));
  }

  return { openMarkets: allMarkets.length, candidates: rankTriage(candidates) };
}

export function selectResearchCandidates(candidates: TriageCandidate[], budget: number): TriageCandidate[] {
  const bestByMarket = new Map<string, TriageCandidate>();
  for (const candidate of rankTriage(candidates)) {
    if (!bestByMarket.has(candidate.marketId)) bestByMarket.set(candidate.marketId, candidate);
  }
  return [...bestByMarket.values()].slice(0, Math.max(0, budget));
}

export async function huntOpportunities(
  searchProvider: SearchProvider,
  opinionProvider: OpinionProvider,
  options: {
    marketLimit?: number;
    researchBudget?: number;
    maxPriorDrift?: number;
    accountValue?: number;
    marketExposure?: number;
    marketExposureByMarket?: Record<string, number>;
    packetDir?: string;
    forecastLog?: string;
  } = {},
): Promise<HuntReport> {
  const marketLimit = options.marketLimit ?? 100;
  const researchBudget = options.researchBudget ?? 8;
  const maxPriorDrift = options.maxPriorDrift ?? 0.08;
  const accountValue = options.accountValue ?? 100;
  const defaultMarketExposure = options.marketExposure ?? 0;
  const marketExposureByMarket = options.marketExposureByMarket ?? {};
  const packetDir = options.packetDir ?? "data/hunt/research";
  const forecastLog = options.forecastLog ?? process.env.ZERO_ONE_FORECAST_LOG ?? "data/forecasts.jsonl";

  const universe = await buildTriageUniverse(marketLimit);
  const selected = selectResearchCandidates(universe.candidates, researchBudget);
  const results: HuntCandidateResult[] = [];

  for (const candidate of selected) {
    try {
      const research = await runAutonomousResearch(
        {
          routing: candidate.routing,
          outcomeIndex: candidate.outcomeIndex,
          marketProbability: candidate.marketProbability,
        },
        searchProvider,
        opinionProvider,
      );
      const council = evaluateEvidenceCouncil(research.bundle, defaultEvidenceCouncilPolicy);
      const packetPath = `${packetDir}/${candidate.marketId}-${candidate.outcomeIndex}-${research.packet.generatedAtMs}.json`;
      await writeJsonAtomic(packetPath, { candidate, packet: research.packet, bundle: research.bundle, council });

      if (council.status !== "FORECAST") {
        results.push({
          candidate,
          status: "RESEARCH_REFUSED",
          council,
          priorDrift: null,
          refreshedProbabilities: candidate.probabilities,
          sides: [],
          bestSide: null,
          reason: council.reason,
          researchPacketPath: packetPath,
        });
        continue;
      }

      const forecastBase = {
        schemaVersion: "0-1.forecast.v1" as const,
        marketId: candidate.marketId,
        outcomeIndex: candidate.outcomeIndex,
        probability: council.probability,
        confidence: council.confidence,
        marketProbability: candidate.marketProbability,
        method: council.method,
        createdAtMs: council.generatedAtMs,
      };
      const forecastRecord: ForecastRecord = { id: sha256Json(forecastBase), ...forecastBase };
      await appendJsonl(forecastLog, forecastRecord);

      const refreshed = await delphi.getMarket({
        id: candidate.marketId,
        pricesAndImpliedProbabilities: true,
        ...competitionScope,
      });
      const refreshedProbabilities = refreshed.spotImpliedProbabilities ?? [];
      const refreshedPrior = refreshedProbabilities[candidate.outcomeIndex];
      if (typeof refreshedPrior !== "number" || !Number.isFinite(refreshedPrior)) {
        results.push({
          candidate,
          status: "PRIOR_DRIFT",
          council,
          priorDrift: null,
          refreshedProbabilities,
          sides: [],
          bestSide: null,
          reason: "Fresh Delphi probability unavailable after research.",
          researchPacketPath: packetPath,
        });
        continue;
      }

      const drift = priorDrift(candidate.marketProbability, refreshedPrior);
      if (drift > maxPriorDrift) {
        results.push({
          candidate,
          status: "PRIOR_DRIFT",
          council,
          priorDrift: drift,
          refreshedProbabilities,
          sides: [],
          bestSide: null,
          reason: `Market prior moved ${drift.toFixed(4)} during research, above ${maxPriorDrift.toFixed(4)}.`,
          researchPacketPath: packetPath,
        });
        continue;
      }

      const marketExposure = marketExposureByMarket[candidate.marketId] ?? defaultMarketExposure;
      const sideSpecs = forecastSides(candidate, council, refreshedProbabilities);
      const sides = [];
      for (const side of sideSpecs) {
        sides.push(await evaluateForecastSide(side, council, accountValue, marketExposure));
      }
      const bestSide = [...sides]
        .filter((side) => side.bestProposal !== null)
        .sort((a, b) => b.opportunityScore - a.opportunityScore)[0] ?? null;

      results.push({
        candidate,
        status: bestSide ? "ACTIONABLE" : "NO_EXECUTABLE_EDGE",
        council,
        priorDrift: drift,
        refreshedProbabilities,
        sides,
        bestSide,
        reason: bestSide ? "At least one side survived quote-aware policy gates." : "No quote size survived execution-edge and risk policy.",
        researchPacketPath: packetPath,
      });
    } catch (error) {
      results.push({
        candidate,
        status: "RESEARCH_FAILED",
        council: null,
        priorDrift: null,
        refreshedProbabilities: candidate.probabilities,
        sides: [],
        bestSide: null,
        reason: error instanceof Error ? error.message : String(error),
        researchPacketPath: null,
      });
    }
  }

  results.sort((a, b) =>
    (b.bestSide?.opportunityScore ?? 0) - (a.bestSide?.opportunityScore ?? 0) ||
    b.candidate.triageScore - a.candidate.triageScore,
  );

  return {
    schemaVersion: "0-1.hunt-report.v1",
    generatedAtMs: Date.now(),
    openMarkets: universe.openMarkets,
    triageCandidates: universe.candidates.length,
    researchBudget,
    researched: results.length,
    actionable: results.filter((result) => result.status === "ACTIONABLE").length,
    results,
  };
}
