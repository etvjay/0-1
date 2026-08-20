import { competitionScope, delphi } from "../delphi/client.js";
import { forecastCryptoThresholdMarket } from "../forecast/crypto/forecaster.js";
import { evaluateEvidenceCouncil, defaultEvidenceCouncilPolicy } from "../forecast/evidence/council.js";
import { runAutonomousResearch } from "../forecast/research/orchestrator.js";
import type { OpinionProvider, SearchProvider } from "../forecast/research/types.js";
import { appendJsonl, sha256Json, writeJsonAtomic } from "../history/io.js";
import type { ForecastRecord } from "../history/types.js";
import { evaluateForecastSide, forecastSides } from "./evaluate.js";
import { rankTriage, triageMarket } from "./triage.js";
import type {
  HuntCandidateResult,
  HuntReport,
  HunterMarketInput,
  OpportunityForecast,
  TriageCandidate,
} from "./types.js";

const priorDrift = (oldP: number, newP: number) => Math.abs(oldP - newP);

const councilForecast = (council: Extract<ReturnType<typeof evaluateEvidenceCouncil>, { status: "FORECAST" }>): OpportunityForecast => ({
  source: "EVIDENCE_COUNCIL",
  marketId: council.marketId,
  outcomeIndex: council.outcomeIndex,
  probability: council.probability,
  confidence: council.confidence,
  marketProbability: council.marketProbability,
  method: council.method,
  generatedAtMs: council.generatedAtMs,
  expiresAtMs: council.expiresAtMs,
  evidenceIds: council.evidenceIds,
  rationale: council.rationale,
  disagreement: council.disagreement,
});

const cryptoForecast = (
  candidate: TriageCandidate,
  result: Awaited<ReturnType<typeof forecastCryptoThresholdMarket>>,
): OpportunityForecast => ({
  source: "CRYPTO_TERMINAL_RV",
  marketId: candidate.marketId,
  outcomeIndex: result.forecast.spec.trueOutcomeIndex,
  probability: result.forecast.probability,
  confidence: result.forecast.confidence,
  marketProbability: result.forecast.marketProbability,
  method: result.forecast.method,
  generatedAtMs: result.forecast.generatedAtMs,
  expiresAtMs: result.belief.expiresAt,
  evidenceIds: result.belief.evidence.map((item) => item.id),
  rationale: result.forecast.rationale,
  disagreement: 0,
});

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
      let forecast: OpportunityForecast | null = null;
      let council: HuntCandidateResult["council"] = null;
      let researchPacketPath: string | null = null;

      if (
        candidate.routing.classification.archetype === "TERMINAL_THRESHOLD" &&
        candidate.routing.classification.specialists.includes("crypto-terminal-rv-v1") &&
        candidate.routing.resolution.resolvesAtMs !== null
      ) {
        try {
          const specialist = await forecastCryptoThresholdMarket({
            marketId: candidate.marketId,
            question: candidate.question,
            outcomes: candidate.outcomes,
            marketProbabilities: candidate.probabilities,
            resolvesAtMs: candidate.routing.resolution.resolvesAtMs,
          });
          forecast = cryptoForecast(candidate, specialist);
          await appendJsonl(forecastLog, specialist.record);
        } catch {
          // Unsupported or unavailable specialist data falls through to the
          // general evidence path; it never forces a forecast or a trade.
        }
      }

      if (!forecast) {
        const research = await runAutonomousResearch(
          {
            routing: candidate.routing,
            outcomeIndex: candidate.outcomeIndex,
            marketProbability: candidate.marketProbability,
          },
          searchProvider,
          opinionProvider,
        );
        council = evaluateEvidenceCouncil(research.bundle, defaultEvidenceCouncilPolicy);
        researchPacketPath = `${packetDir}/${candidate.marketId}-${candidate.outcomeIndex}-${research.packet.generatedAtMs}.json`;
        await writeJsonAtomic(researchPacketPath, { candidate, packet: research.packet, bundle: research.bundle, council });

        if (council.status !== "FORECAST") {
          results.push({
            candidate,
            status: "RESEARCH_REFUSED",
            forecast: null,
            council,
            priorDrift: null,
            refreshedProbabilities: candidate.probabilities,
            sides: [],
            bestSide: null,
            reason: council.reason,
            researchPacketPath,
          });
          continue;
        }

        forecast = councilForecast(council);
        const forecastBase = {
          schemaVersion: "0-1.forecast.v1" as const,
          marketId: forecast.marketId,
          outcomeIndex: forecast.outcomeIndex,
          probability: forecast.probability,
          confidence: forecast.confidence,
          marketProbability: forecast.marketProbability,
          method: forecast.method,
          createdAtMs: forecast.generatedAtMs,
        };
        const forecastRecord: ForecastRecord = { id: sha256Json(forecastBase), ...forecastBase };
        await appendJsonl(forecastLog, forecastRecord);
      }

      const refreshed = await delphi.getMarket({
        id: candidate.marketId,
        pricesAndImpliedProbabilities: true,
        ...competitionScope,
      });
      const refreshedProbabilities = refreshed.spotImpliedProbabilities ?? [];
      const refreshedPrior = refreshedProbabilities[forecast.outcomeIndex];
      if (typeof refreshedPrior !== "number" || !Number.isFinite(refreshedPrior)) {
        results.push({
          candidate,
          status: "PRIOR_DRIFT",
          forecast,
          council,
          priorDrift: null,
          refreshedProbabilities,
          sides: [],
          bestSide: null,
          reason: "Fresh Delphi probability unavailable after forecasting.",
          researchPacketPath,
        });
        continue;
      }

      const drift = priorDrift(forecast.marketProbability, refreshedPrior);
      if (drift > maxPriorDrift) {
        results.push({
          candidate,
          status: "PRIOR_DRIFT",
          forecast,
          council,
          priorDrift: drift,
          refreshedProbabilities,
          sides: [],
          bestSide: null,
          reason: `Market prior moved ${drift.toFixed(4)} during forecasting, above ${maxPriorDrift.toFixed(4)}.`,
          researchPacketPath,
        });
        continue;
      }

      const marketExposure = marketExposureByMarket[candidate.marketId] ?? defaultMarketExposure;
      const sideSpecs = forecastSides(candidate, forecast, refreshedProbabilities);
      const sides = [];
      for (const side of sideSpecs) {
        sides.push(await evaluateForecastSide(side, forecast, accountValue, marketExposure));
      }
      const bestSide = [...sides]
        .filter((side) => side.bestProposal !== null)
        .sort((a, b) => b.opportunityScore - a.opportunityScore)[0] ?? null;

      results.push({
        candidate,
        status: bestSide ? "ACTIONABLE" : "NO_EXECUTABLE_EDGE",
        forecast,
        council,
        priorDrift: drift,
        refreshedProbabilities,
        sides,
        bestSide,
        reason: bestSide
          ? `At least one ${forecast.source} side survived quote-aware policy gates.`
          : `No ${forecast.source} quote size survived execution-edge and risk policy.`,
        researchPacketPath,
      });
    } catch (error) {
      results.push({
        candidate,
        status: "RESEARCH_FAILED",
        forecast: null,
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
