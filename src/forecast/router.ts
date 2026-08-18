import type { MarketDomain, MarketRoutingDecision, MarketArchetype } from "./types.js";
import type { HexAddress } from "../domain/types.js";

interface RouteInput {
  marketId: HexAddress;
  question: string;
  outcomes: string[];
  category: string | null;
  resolvesAt?: string | null;
  settlesAt?: string | null;
  dataSources?: unknown;
}

const parseDate = (value?: string | null): number | null => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const domainFromCategory = (category: string | null): MarketDomain => {
  switch ((category ?? "").toLowerCase()) {
    case "crypto": return "CRYPTO";
    case "culture": return "CULTURE";
    case "economics": return "ECONOMICS";
    case "politics": return "POLITICS";
    case "sports": return "SPORTS";
    default: return "MISCELLANEOUS";
  }
};

const classifyArchetype = (domain: MarketDomain, question: string): { archetype: MarketArchetype; specialists: string[]; reasons: string[] } => {
  const q = question.toLowerCase();
  const hasThreshold = /\b(above|below|over|under|at least|at most|exceed|greater than|less than)\b/.test(q);
  const pathDependent = /\b(hit|touch|ever|at any time|reach)\b/.test(q);
  const election = /\b(election|elect(ed|ion)|vote|poll|primary|president|parliament|senate|governor)\b/.test(q);
  const macro = /\b(cpi|inflation|gdp|unemployment|jobs report|nonfarm|interest rate|fed|ecb|boe|rate cut|rate hike)\b/.test(q);
  const scheduled = /\b(announce|release|launch|approve|decision|report|publish|filing|earnings)\b/.test(q);

  if (domain === "SPORTS") return { archetype: "SPORTS_EVENT", specialists: ["sports-state-v1", "research-evidence-v1"], reasons: ["Delphi category=sports"] };
  if (election || domain === "POLITICS") return { archetype: "ELECTION_OR_POLL", specialists: ["politics-polling-v1", "research-evidence-v1"], reasons: [election ? "election/poll language detected" : "Delphi category=politics"] };
  if (macro || domain === "ECONOMICS") return { archetype: "MACRO_RELEASE", specialists: ["macro-nowcast-v1", "research-evidence-v1"], reasons: [macro ? "macro-release language detected" : "Delphi category=economics"] };
  if (domain === "CRYPTO" && hasThreshold && pathDependent) return { archetype: "PATH_DEPENDENT_THRESHOLD", specialists: ["crypto-barrier-v1", "research-evidence-v1"], reasons: ["crypto threshold is path-dependent"] };
  if (domain === "CRYPTO" && hasThreshold) return { archetype: "TERMINAL_THRESHOLD", specialists: ["crypto-terminal-rv-v1", "research-evidence-v1"], reasons: ["crypto terminal threshold detected"] };
  if (scheduled) return { archetype: "SCHEDULED_ANNOUNCEMENT", specialists: ["scheduled-event-v1", "research-evidence-v1"], reasons: ["scheduled announcement/release language detected"] };
  if (domain === "CULTURE") return { archetype: "PRODUCT_OR_CULTURE_EVENT", specialists: ["culture-event-v1", "research-evidence-v1"], reasons: ["Delphi category=culture"] };
  return { archetype: "GENERIC_BINARY_EVENT", specialists: ["research-evidence-v1", "market-prior-v1"], reasons: ["no narrower deterministic archetype matched"] };
};

export function routeMarket(input: RouteInput): MarketRoutingDecision {
  const domain = domainFromCategory(input.category);
  const classified = classifyArchetype(domain, input.question);
  const rawSources = Array.isArray(input.dataSources) ? input.dataSources : [];
  const acceptableDataSources = rawSources.map((source) => typeof source === "string" ? source : JSON.stringify(source));
  const ambiguities: string[] = [];
  if (input.outcomes.length < 2) ambiguities.push("Market has fewer than two labeled outcomes.");
  if (!parseDate(input.resolvesAt) && !parseDate(input.settlesAt)) ambiguities.push("No explicit resolution/settlement timestamp is available from the market record.");

  return {
    resolution: {
      marketId: input.marketId,
      question: input.question,
      outcomes: [...input.outcomes],
      closesAtMs: null,
      resolvesAtMs: parseDate(input.resolvesAt),
      settlesAtMs: parseDate(input.settlesAt),
      acceptableDataSources,
      ambiguities,
      invalidationConditions: [
        "Resolution semantics differ from the parsed proposition.",
        "Authoritative source or outcome mapping changes.",
      ],
    },
    classification: {
      domain,
      archetype: classified.archetype,
      confidence: ambiguities.length === 0 ? 0.9 : 0.65,
      specialists: classified.specialists,
      reasons: classified.reasons,
    },
  };
}
