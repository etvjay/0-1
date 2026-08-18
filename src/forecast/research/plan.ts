import { sha256Json } from "../../history/io.js";
import type { MarketRoutingDecision } from "../types.js";
import type { ResearchPlan, ResearchQuery } from "./types.js";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

const sourceDomains = (routing: MarketRoutingDecision): string[] => {
  const raw = routing.resolution.acceptableDataSources;
  const domains: string[] = [];
  for (const source of raw) {
    try {
      const url = new URL(source);
      domains.push(url.hostname.replace(/^www\./, ""));
    } catch {
      // Data-source identifiers are not necessarily URLs.
    }
  }
  return [...new Set(domains)];
};

const make = (
  intent: ResearchQuery["intent"],
  query: string,
  includeDomains: string[] = [],
  maxResults = 5,
): ResearchQuery => {
  const base = { intent, query: clean(query), includeDomains, maxResults };
  return { id: sha256Json(base), ...base };
};

export function buildResearchPlan(
  routing: MarketRoutingDecision,
  outcomeIndex: number,
  nowMs = Date.now(),
): ResearchPlan {
  const { resolution, classification } = routing;
  const outcome = resolution.outcomes[outcomeIndex] ?? `outcome ${outcomeIndex}`;
  const officialDomains = sourceDomains(routing);
  const proposition = `\"${resolution.question}\" outcome \"${outcome}\"`;

  const queries: ResearchQuery[] = [
    make("PRIMARY", `${proposition} official primary source latest`, officialDomains, 5),
    make("CORROBORATE", `${proposition} latest evidence independent reporting`, [], 6),
    make("OPPOSE", `${proposition} evidence against contrary false not happen`, [], 6),
    make("BASE_RATE", `${classification.archetype} similar historical cases base rate`, [], 5),
  ];

  if (classification.domain === "POLITICS") {
    queries.push(make("CORROBORATE", `${resolution.question} polls polling average latest`, [], 6));
  } else if (classification.domain === "SPORTS") {
    queries.push(make("PRIMARY", `${resolution.question} official score injury lineup schedule`, officialDomains, 6));
  } else if (classification.domain === "ECONOMICS") {
    queries.push(make("PRIMARY", `${resolution.question} official statistical release central bank government`, officialDomains, 6));
  }

  return {
    schemaVersion: "0-1.research-plan.v1",
    generatedAtMs: nowMs,
    marketId: resolution.marketId,
    outcomeIndex,
    queries,
  };
}
