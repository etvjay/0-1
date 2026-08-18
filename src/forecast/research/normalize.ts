import { sha256Json } from "../../history/io.js";
import type { EvidenceItem } from "../evidence/types.js";
import type { SearchResultRecord } from "./types.js";

const hostname = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

const reliabilityFor = (result: SearchResultRecord): number => {
  if (result.queryIntent === "PRIMARY") return 0.9;
  if (result.queryIntent === "BASE_RATE") return 0.65;
  return 0.72;
};

const sourceTypeFor = (result: SearchResultRecord): EvidenceItem["sourceType"] => {
  if (result.queryIntent === "PRIMARY") return "PRIMARY";
  return "NEWS";
};

export function normalizeSearchEvidence(
  results: SearchResultRecord[],
  nowMs = Date.now(),
  maxAgeMs = 12 * 60 * 60 * 1000,
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
    const base = {
      source: result.url,
      sourceType: sourceTypeFor(result),
      observedAtMs: observed,
      expiresAtMs,
      supports: "Unassessed search evidence; stance is assigned by the opinion provider.",
      value: {
        title: result.title,
        content: result.content,
        queryIntent: result.queryIntent,
        provider: result.provider,
      },
      stance: "CONTEXT" as const,
      reliability: reliabilityFor(result),
      independenceGroup: group,
      summary: result.title,
    };
    evidence.push({ id: sha256Json(base), ...base });
  }

  return evidence.filter((item) => item.expiresAtMs === null || item.expiresAtMs >= nowMs);
}
