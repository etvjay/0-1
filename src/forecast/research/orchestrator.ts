import type { HexAddress } from "../../domain/types.js";
import type { MarketRoutingDecision } from "../types.js";
import type { EvidenceForecastBundle, ForecastOpinion } from "../evidence/types.js";
import { normalizeSearchEvidence } from "./normalize.js";
import { buildResearchPlan } from "./plan.js";
import type {
  AutonomousResearchResult,
  OpinionFailureDiagnostic,
  OpinionProvider,
  SearchFailureDiagnostic,
  SearchProvider,
} from "./types.js";

export async function runAutonomousResearch(
  input: {
    routing: MarketRoutingDecision;
    outcomeIndex: number;
    marketProbability: number;
  },
  searchProvider: SearchProvider,
  opinionProvider: OpinionProvider,
  nowMs = Date.now(),
): Promise<AutonomousResearchResult> {
  const { routing, outcomeIndex, marketProbability } = input;
  if (!Number.isFinite(marketProbability) || marketProbability < 0 || marketProbability > 1) {
    throw new Error("marketProbability must be between 0 and 1");
  }
  if (!Number.isInteger(outcomeIndex) || outcomeIndex < 0 || outcomeIndex >= routing.resolution.outcomes.length) {
    throw new Error(`Invalid outcome index ${outcomeIndex}`);
  }

  const plan = buildResearchPlan(routing, outcomeIndex, nowMs);
  const settled = await Promise.allSettled(plan.queries.map((query) => searchProvider.search({ query })));
  const searchResults = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const searchFailures: SearchFailureDiagnostic[] = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [];
    const query = plan.queries[index];
    if (!query) return [];
    return [{
      queryId: query.id,
      intent: query.intent,
      query: query.query,
      provider: searchProvider.name,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    }];
  });
  const evidence = normalizeSearchEvidence(searchResults, nowMs);
  const outcomeLabel = routing.resolution.outcomes[outcomeIndex] ?? `outcome ${outcomeIndex}`;

  const roles = ["ADVOCATE", "OPPOSE"] as const;
  const opinions: ForecastOpinion[] = [];
  const opinionFailures: OpinionFailureDiagnostic[] = [];

  if (evidence.length === 0) {
    for (const role of roles) {
      opinionFailures.push({
        role,
        provider: opinionProvider.name,
        error: "NO_EVIDENCE: forecasting skipped because retrieval produced zero normalized evidence items",
      });
    }
  } else {
    const opinionSettled = await Promise.allSettled(roles.map((role) => opinionProvider.forecast({
      routing,
      outcomeIndex,
      outcomeLabel,
      marketProbability,
      role,
      evidence,
      nowMs,
    })));

    opinionSettled.forEach((result, index) => {
      const role = roles[index];
      if (!role) return;
      if (result.status === "fulfilled") {
        opinions.push(result.value);
      } else {
        opinionFailures.push({
          role,
          provider: opinionProvider.name,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });
  }

  const bundle: EvidenceForecastBundle = {
    schemaVersion: "0-1.evidence-bundle.v1",
    generatedAtMs: nowMs,
    routing,
    marketProbability,
    outcomeIndex,
    evidence,
    opinions,
  };

  return {
    packet: {
      schemaVersion: "0-1.research-packet.v1",
      generatedAtMs: nowMs,
      routing,
      outcomeIndex,
      marketProbability,
      plan,
      searchResults,
      searchFailures,
      evidence,
      opinionFailures,
    },
    bundle,
  };
}

export function researchMarketId(result: AutonomousResearchResult): HexAddress {
  return result.bundle.routing.resolution.marketId;
}
