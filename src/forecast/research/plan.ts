import { sha256Json } from "../../history/io.js";
import type { MarketRoutingDecision } from "../types.js";
import type { ResearchPlan, ResearchQuery } from "./types.js";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

const searchSubject = (question: string): string => {
  const subject = clean(question).replace(/[?]+$/, "");
  // DDGS is much more reliable with natural, unquoted queries than with the
  // full resolution proposition plus boolean-style search boilerplate.
  return subject.length <= 220 ? subject : `${subject.slice(0, 217).trimEnd()}...`;
};

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
  maxResults = 4,
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
  const outcome = clean(resolution.outcomes[outcomeIndex] ?? `outcome ${outcomeIndex}`);
  const officialDomains = sourceDomains(routing);
  const subject = searchSubject(resolution.question);
  const primaryQuery = officialDomains.length > 0 ? subject : `${subject} official`;

  const queries: ResearchQuery[] = [
    make("PRIMARY", primaryQuery, officialDomains, 4),
    make("CORROBORATE", `${subject} ${outcome} latest`, [], 4),
    make("OPPOSE", `${subject} ${outcome} contrary evidence`, [], 4),
    make("BASE_RATE", `${classification.archetype.replaceAll("_", " ")} historical base rate`, [], 3),
  ];

  if (classification.domain === "POLITICS") {
    queries.push(make("CORROBORATE", `${subject} latest polls polling average`, [], 4));
  } else if (classification.domain === "SPORTS") {
    queries.push(make("PRIMARY", `${subject} official score lineup injury`, officialDomains, 4));
  } else if (classification.domain === "ECONOMICS") {
    queries.push(make("PRIMARY", `${subject} official release data`, officialDomains, 4));
  }

  return {
    schemaVersion: "0-1.research-plan.v1",
    generatedAtMs: nowMs,
    marketId: resolution.marketId,
    outcomeIndex,
    queries,
  };
}
