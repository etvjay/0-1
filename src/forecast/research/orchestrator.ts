import type { HexAddress } from "../../domain/types.js";
import type { MarketRoutingDecision } from "../types.js";
import type { EvidenceForecastBundle, ForecastOpinion } from "../evidence/types.js";
import { normalizeSearchEvidence } from "./normalize.js";
import { buildResearchPlan } from "./plan.js";
import type { AutonomousResearchResult, OpinionFailureDiagnostic, OpinionProvider, SearchProvider } from "./types.js";

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
  const evidence = normalizeSearchEvidence(searchResults, nowMs);
  const outcomeLabel = routing.resolution.outcomes[outcomeIndex] ?? `outcome ${outcomeIndex}`;

  const roles = ["ADVOCATE", "OPPOSE"] as const;
  const opinions: ForecastOpinion[] = [];
  const opinionFailures: OpinionFailureDiagnostic[] = [];
  for (const role of roles) {
    try {
      opinions.push(await opinionProvider.forecast({
        routing,
        outcomeIndex,
        outcomeLabel,
        marketProbability,
        role,
        evidence,
        nowMs,
      }));
    } catch (error) {
      // Preserve the failure in the research packet. The council still sees the
      // missing opinion as missing judgment, never as a fabricated probability.
      opinionFailures.push({
        role,
        provider: opinionProvider.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
      evidence,
      opinionFailures,
    },
    bundle,
  };
}

export function researchMarketId(result: AutonomousResearchResult): HexAddress {
  return result.bundle.routing.resolution.marketId;
}
