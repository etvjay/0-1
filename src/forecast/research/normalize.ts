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
const FOOTBALL_CONTEXT = ["football", "soccer", "uefa", "spfl", "premiership", "ibrox", "conference league", "europa", "champions league"];
const BASEBALL_CONTEXT = ["mlb", "baseball", "american league", "major league baseball"];

interface SportsParticipant {
  core: string[];
  qualifiers: string[];
}

const parseParticipant = (value: string): SportsParticipant => {
  const qualifiers = [...value.matchAll(/\(([^)]+)\)/g)]
    .flatMap((match) => normalizeText(match[1] ?? "").split(" "))
    .filter((token) => token.length >= 3 && !SPORTS_ENTITY_STOPWORDS.has(token));

  const withoutQualifiers = value.replace(/\([^)]+\)/g, " ");
  const core = normalizeText(withoutQualifiers)
    .split(" ")
    .filter((token) => token.length >= 3 && !SPORTS_ENTITY_STOPWORDS.has(token));

  return { core, qualifiers };
};

const sportsParticipants = (question: string): [SportsParticipant, SportsParticipant] | null => {
  const match = question.match(/^\s*will\s+(.+?)\s+beat\s+(.+?)(?=\s+by\s+\d|\s+in\s+regulation|\s+in\s+their|\s+on\s+|\?|$)/i);
  if (!match?.[1] || !match[2]) return null;
  return [parseParticipant(match[1]), parseParticipant(match[2])];
};

const containsPhrase = (normalized: string, phrase: string): boolean => normalized.includes(` ${normalizeText(phrase)} `);
const hasFootballContext = (normalized: string): boolean => FOOTBALL_CONTEXT.some((term) => containsPhrase(normalized, term));
const hasBaseballContext = (normalized: string): boolean => BASEBALL_CONTEXT.some((term) => containsPhrase(normalized, term));

const mentionsParticipant = (text: string, participant: SportsParticipant): boolean => {
  if (participant.core.length === 0) return false;
  const normalized = ` ${normalizeText(text)} `;
  if (!participant.core.every((token) => normalized.includes(` ${token} `))) return false;

  if (participant.qualifiers.length === 0) return true;
  const qualifierMatch = participant.qualifiers.every((token) => normalized.includes(` ${token} `));
  if (qualifierMatch) return true;

  // Parenthetical labels such as Rangers (Glasgow) are disambiguators, not
  // necessarily the literal naming used by every source. Football context can
  // satisfy the qualifier, but explicit baseball context must never do so.
  return hasFootballContext(normalized) && !hasBaseballContext(normalized);
};

const sportsRelevant = (result: SearchResultRecord, routing?: MarketRoutingDecision): boolean => {
  if (routing?.classification.domain !== "SPORTS") return true;
  const participants = sportsParticipants(routing.resolution.question);
  if (!participants) return true;

  const text = `${result.title} ${result.content} ${result.url}`;
  const left = mentionsParticipant(text, participants[0]);
  const right = mentionsParticipant(text, participants[1]);

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
