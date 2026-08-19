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

const browserSearchQuery = (query: SearchRequest["query"]): string => {
  if (query.includeDomains.length === 0) return query.query;
  const domainClause = query.includeDomains.map((domain) => `site:${domain}`).join(" OR ");
  return `${query.query} (${domainClause})`;
};

const searchUrls = (query: SearchRequest["query"]): string[] => {
  const encoded = encodeURIComponent(browserSearchQuery(query));
  return [
    `https://www.bing.com/search?q=${encoded}&count=5`,
    `https://search.brave.com/search?q=${encoded}&source=web`,
  ];
};

export class HermesSearchProvider implements SearchProvider {
  readonly name = "hermes-browser-search-v1";
  private readonly client = new HermesClient();

  async search({ query }: SearchRequest): Promise<SearchResultRecord[]> {
    const urls = searchUrls(query);
    const system = [
      "You are 0-1's bounded live research retrieval agent.",
      "Do not answer from model memory.",
      "For this request, do NOT call web_search or web_extract.",
      "Your first tool call MUST be browser_navigate using the first supplied search URL, followed by browser_snapshot.",
      "If that search page is blocked, empty, or unusable, use browser_navigate on the second supplied search URL and browser_snapshot once.",
      "From the search-results snapshot, choose at most two relevant source URLs. Navigate to each chosen source and inspect it with browser_snapshot.",
      "Do not use terminal, file, code execution, skills, memory, delegation, cron, image, or any other tool.",
      "Never make more than four browser_navigate calls total for this request.",
      "Return factual evidence from pages actually visited, not a probability and not a trading decision.",
      "Prefer primary/official sources for PRIMARY queries and independent corroboration for other queries.",
      "Honor includeDomains when provided: only return source URLs whose hostname matches one of those domains or its subdomains.",
      "Return only JSON: {\"results\":[{\"title\":string,\"url\":string,\"content\":string,\"published_at\":string|null}]}",
      "Every returned URL must be a real source page you actually visited with browser_navigate. Do not return the search-results URL itself and do not invent URLs.",
      "If browser retrieval fails, immediately return {\"results\":[]}.",
    ].join(" ");

    const user = JSON.stringify({
      intent: query.intent,
      query: query.query,
      includeDomains: query.includeDomains,
      maxResults: Math.min(query.maxResults, 2),
      searchUrls: urls,
    });

    const parsed = parseHermesJson<HermesSearchResponse>(await this.client.chat(system, user));
    if (!parsed || !Array.isArray(parsed.results)) throw new Error("Hermes search JSON shape invalid");
    const observedAtMs = Date.now();
    return parsed.results.slice(0, Math.min(query.maxResults, 2)).flatMap((item) => {
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
