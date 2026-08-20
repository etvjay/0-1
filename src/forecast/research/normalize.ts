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
          ? "Evidence from a resolution-approved source domain; interpretation remains model-bounded."
          : "Unassessed search evidence; stance is assigned by the opinion provider.",
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
