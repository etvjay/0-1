import { sha256Json } from "../../history/io.js";
import { HermesClient, parseHermesJson } from "./hermes-client.js";
import type { SearchProvider, SearchRequest, SearchResultRecord } from "./types.js";

interface HermesSearchItem {
  title: string;
  url: string;
  content: string;
  published_at?: string | null;
}

interface HermesSearchResponse {
  results: HermesSearchItem[];
}

const parsePublished = (value?: string | null): number | null => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

export class HermesSearchProvider implements SearchProvider {
  readonly name = "hermes-web-search-v2";
  private readonly client = new HermesClient();

  async search({ query }: SearchRequest): Promise<SearchResultRecord[]> {
    const system = [
      "You are 0-1's bounded research retrieval agent.",
      "Do not answer from model memory.",
      "First use web_search. Make at most two web_search attempts; if the first returns no results, simplify/rephrase once.",
      "If web_search still returns no usable results, you MAY use browser navigation/snapshot tools only to access up to two likely live sources.",
      "Do NOT use web_extract, terminal, file, code execution, skills, memory, delegation, cron, image, or any other tool.",
      "If both search and browser fallback fail, immediately return {\"results\":[]}.",
      "Return factual evidence only, not a probability and not a trading decision.",
      "Prefer primary/official sources for PRIMARY queries and independent corroboration for other queries.",
      "Honor includeDomains when provided: only return URLs whose hostname matches one of those domains or its subdomains.",
      "Return only JSON: {\"results\":[{\"title\":string,\"url\":string,\"content\":string,\"published_at\":string|null}]}",
      "Every result URL must be a real URL returned by web_search or actually visited with the browser. Do not invent URLs.",
    ].join(" ");

    const user = JSON.stringify({
      intent: query.intent,
      query: query.query,
      includeDomains: query.includeDomains,
      maxResults: query.maxResults,
    });

    const parsed = parseHermesJson<HermesSearchResponse>(await this.client.chat(system, user));
    if (!parsed || !Array.isArray(parsed.results)) throw new Error("Hermes search JSON shape invalid");
    const observedAtMs = Date.now();
    return parsed.results.slice(0, query.maxResults).flatMap((item) => {
      if (!item || typeof item.title !== "string" || typeof item.url !== "string" || typeof item.content !== "string") return [];
      let url: URL;
      try {
        url = new URL(item.url);
      } catch {
        return [];
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") return [];
      if (query.includeDomains.length > 0) {
        const host = url.hostname.replace(/^www\./, "").toLowerCase();
        const allowed = query.includeDomains.some((domain) => {
          const normalized = domain.replace(/^www\./, "").toLowerCase();
          return host === normalized || host.endsWith(`.${normalized}`);
        });
        if (!allowed) return [];
      }
      const base = {
        queryId: query.id,
        queryIntent: query.intent,
        provider: this.name,
        title: item.title.trim(),
        url: url.toString(),
        content: item.content.trim(),
        score: null,
        publishedAtMs: parsePublished(item.published_at),
        observedAtMs,
      };
      if (!base.title || !base.content) return [];
      return [{ schemaVersion: "0-1.search-result.v1" as const, id: sha256Json(base), ...base }];
    });
  }
}
