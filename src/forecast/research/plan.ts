import { sha256Json } from "../../history/io.js";
import type { MarketRoutingDecision } from "../types.js";
import type { ResearchPlan, ResearchQuery } from "./types.js";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

const searchSubject = (question: string): string => {
  const subject = clean(question).replace(/[?]+$/, "");
  return subject.length <= 220 ? subject : `${subject.slice(0, 217).trimEnd()}...`;
};

interface SportsEntities {
  left: string;
  right: string;
  leftSearch: string;
  rightSearch: string;
  date: string;
}

const entitySearch = (value: string): string => {
  const qualifiers = [...value.matchAll(/\(([^)]+)\)/g)]
    .map((match) => clean(match[1] ?? ""))
    .filter(Boolean);
  const core = clean(value.replace(/\([^)]+\)/g, " "));
  return clean(`"${core}" ${qualifiers.join(" ")}`);
};

const sportsEntities = (question: string): SportsEntities | null => {
  const match = question.match(/^\s*will\s+(.+?)\s+beat\s+(.+?)(?=\s+by\s+\d|\s+in\s+regulation|\s+in\s+their|\s+on\s+|\?|$)/i);
  if (!match?.[1] || !match[2]) return null;

  const dateMatch = question.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i);
  const leftRaw = clean(match[1]);
  const rightRaw = clean(match[2]);
  return {
    left: clean(leftRaw.replace(/[()]/g, " ")),
    right: clean(rightRaw.replace(/[()]/g, " ")),
    leftSearch: entitySearch(leftRaw),
    rightSearch: entitySearch(rightRaw),
    date: dateMatch?.[0] ?? "",
  };
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

  if (classification.domain === "SPORTS") {
    const entities = sportsEntities(resolution.question);
    if (entities) {
      const fixture = clean(`${entities.leftSearch} ${entities.rightSearch} ${entities.date}`);
      const queries: ResearchQuery[] = [
        make("PRIMARY", `${fixture} official fixture score`, officialDomains, 5),
        make("CORROBORATE", `${fixture} football preview odds lineup injuries`, [], 6),
        make("CORROBORATE", `${entities.leftSearch} football team news injuries lineup`, [], 5),
        make("OPPOSE", `${entities.rightSearch} football team news recent form results`, [], 6),
        make("BASE_RATE", `${entities.leftSearch} football recent results goal margin`, [], 6),
        make("BASE_RATE", `${entities.rightSearch} football recent results goal margin`, [], 6),
      ];
      return {
        schemaVersion: "0-1.research-plan.v1",
        generatedAtMs: nowMs,
        marketId: resolution.marketId,
        outcomeIndex,
        queries,
      };
    }
  }

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
