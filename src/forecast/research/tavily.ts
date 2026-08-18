import { sha256Json } from "../../history/io.js";
import type { ResearchQuery, SearchProvider, SearchRequest, SearchResultRecord } from "./types.js";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

const parsePublished = (value?: string): number | null => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

export class TavilySearchProvider implements SearchProvider {
  readonly name = "tavily-search-v1";
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(apiKey = process.env.TAVILY_API_KEY ?? "", endpoint = "https://api.tavily.com/search") {
    if (!apiKey) throw new Error("TAVILY_API_KEY is required for autonomous research");
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async search({ query }: SearchRequest): Promise<SearchResultRecord[]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.query,
        search_depth: "advanced",
        topic: "general",
        max_results: query.maxResults,
        include_domains: query.includeDomains.length > 0 ? query.includeDomains : undefined,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Tavily search failed: ${response.status} ${await response.text()}`);

    const payload = await response.json() as TavilyResponse;
    const observedAtMs = Date.now();
    return (payload.results ?? []).flatMap((result) => {
      if (!result.url || !result.title || !result.content) return [];
      const base = {
        queryId: query.id,
        queryIntent: query.intent,
        provider: this.name,
        title: result.title,
        url: result.url,
        content: result.content,
        score: typeof result.score === "number" ? result.score : null,
        publishedAtMs: parsePublished(result.published_date),
        observedAtMs,
      };
      return [{ schemaVersion: "0-1.search-result.v1" as const, id: sha256Json(base), ...base }];
    });
  }
}

export async function executeResearchQueries(
  provider: SearchProvider,
  queries: ResearchQuery[],
): Promise<SearchResultRecord[]> {
  const settled = await Promise.allSettled(queries.map((query) => provider.search({ query })));
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}
