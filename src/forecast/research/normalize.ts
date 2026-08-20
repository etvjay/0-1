import { sha256Json } from "../../history/io.js";
import type { MarketRoutingDecision } from "../types.js";
import type { EvidenceItem } from "../evidence/types.js";
import type { SearchResultRecord } from "./types.js";

const hostname = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

const approvedDomains = (routing?: MarketRoutingDecision): string[] => {
  if (!routing) return [];
  return routing.resolution.acceptableDataSources.flatMap((source) => {
    try {
      return [new URL(source).hostname.replace(/^www\./, "").toLowerCase()];
    } catch {
      return [];
    }
  });
};

const domainMatches = (host: string, approved: string[]): boolean => approved.some((domain) => host === domain || host.endsWith(`.${domain}`));
const isCambrian = (result: SearchResultRecord): boolean => result.provider.startsWith("cambrian-");

const normalizeText = (value: string): string => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const SPORTS_ENTITY_STOPWORDS = new Set(["fc", "fk", "afc", "cf", "sc", "club"]);

const participantTokens = (value: string): string[] => normalizeText(value)
  .split(" ")
  .filter((token) => token.length >= 3 && !SPORTS_ENTITY_STOPWORDS.has(token));

const sportsParticipants = (question: string): [string, string] | null => {
  const match = question.match(/^\s*will\s+(.+?)\s+beat\s+(.+?)(?=\s+by\s+\d|\s+in\s+regulation|\s+in\s+their|\s+on\s+|\?|$)/i);
  if (!match?.[1] || !match[2]) return null;
  return [match[1].replace(/[()]/g, " "), match[2].replace(/[()]/g, " ")];
};

const mentionsParticipant = (text: string, participant: string): boolean => {
  const tokens = participantTokens(participant);
  if (tokens.length === 0) return false;
  const normalized = ` ${normalizeText(text)} `;
  return tokens.some((token) => normalized.includes(` ${token} `));
};

const sportsRelevant = (result: SearchResultRecord, routing?: MarketRoutingDecision): boolean => {
  if (routing?.classification.domain !== "SPORTS") return true;
  const participants = sportsParticipants(routing.resolution.question);
  if (!participants) return true;

  const text = `${result.title} ${result.content} ${result.url}`;
  const left = mentionsParticipant(text, participants[0]);
  const right = mentionsParticipant(text, participants[1]);

  // Match-specific evidence must identify both sides. Team-form/base-rate evidence
  // may legitimately describe one participant in isolation.
  return result.queryIntent === "BASE_RATE" ? left || right : left && right;
};

const isApprovedPrimary = (result: SearchResultRecord, routing?: MarketRoutingDecision): boolean => {
  if (isCambrian(result)) return false;
  const approved = approvedDomains(routing);
  return approved.length > 0 && domainMatches(hostname(result.url), approved);
};

const reliabilityFor = (result: SearchResultRecord, routing?: MarketRoutingDecision): number => {
  if (isCambrian(result)) return 0.92;
  if (isApprovedPrimary(result, routing)) return 0.9;
  if (result.queryIntent === "BASE_RATE") return 0.6;
  return 0.68;
};

const sourceTypeFor = (result: SearchResultRecord, routing?: MarketRoutingDecision): EvidenceItem["sourceType"] => {
  if (isCambrian(result)) return "DATA_FEED";
  if (isApprovedPrimary(result, routing)) return "PRIMARY";
  return "NEWS";
};

export function normalizeSearchEvidence(
  results: SearchResultRecord[],
  nowMs = Date.now(),
  maxAgeMs = 12 * 60 * 60 * 1000,
  routing?: MarketRoutingDecision,
): EvidenceItem[] {
  const seen = new Set<string>();
  const evidence: EvidenceItem[] = [];

  for (const result of results) {
    if (!sportsRelevant(result, routing)) continue;

    const group = hostname(result.url);
    const dedupeKey = `${group}:${result.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const observed = result.publishedAtMs ?? result.observedAtMs;
    const expiresAtMs = observed + maxAgeMs;
    const primary = isApprovedPrimary(result, routing);
    const base = {
      source: result.url,
      sourceType: sourceTypeFor(result, routing),
      observedAtMs: observed,
      expiresAtMs,
      supports: isCambrian(result)
        ? "Structured on-chain financial data supplied by Cambrian; interpretation remains model-bounded."
        : primary
          ? "Evidence from a resolution-approved source domain and relevant market entities; interpretation remains model-bounded."
          : "Search evidence passed market-entity relevance checks; stance is assigned by the opinion provider.",
      value: {
        title: result.title,
        content: result.content,
        queryIntent: result.queryIntent,
        provider: result.provider,
      },
      stance: "CONTEXT" as const,
      reliability: reliabilityFor(result, routing),
      independenceGroup: isCambrian(result) ? "cambrian" : group,
      summary: result.title,
    };
    evidence.push({ id: sha256Json(base), ...base });
  }

  return evidence.filter((item) => item.expiresAtMs === null || item.expiresAtMs >= nowMs);
}
