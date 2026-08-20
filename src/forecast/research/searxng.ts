import { sha256Json } from "../../history/io.js";
import type { ResearchQuery, SearchProvider, SearchRequest, SearchResultRecord } from "./types.js";

interface SearxngItem {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
  publishedDate?: unknown;
  published_date?: unknown;
}

interface SearxngResponse {
  results?: unknown;
  unresponsive_engines?: unknown;
}

interface SearxngFetchResult {
  items: SearxngItem[];
  unresponsive: string[];
}

const parsePublished = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const matchesDomain = (url: URL, domains: string[]): boolean => {
  if (domains.length === 0) return true;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  return domains.some((domain) => {
    const normalized = domain.replace(/^www\./, "").toLowerCase();
    return host === normalized || host.endsWith(`.${normalized}`);
  });
};

const SEARCH_STOPWORDS = new Set([
  "a", "an", "and", "are", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "their", "to", "will", "with",
]);

const normalizeText = (value: string): string => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const queryTokens = (query: string): string[] => normalizeText(query)
  .split(" ")
  .filter((token) => token.length >= 3 && !SEARCH_STOPWORDS.has(token));

const quotedPhrases = (query: string): string[] => [...query.matchAll(/"([^"]+)"/g)]
  .map((match) => normalizeText(match[1] ?? ""))
  .filter(Boolean);

const relevanceScore = (item: SearxngItem, query: ResearchQuery): number => {
  const title = typeof item.title === "string" ? item.title : "";
  const content = typeof item.content === "string" ? item.content : "";
  const text = ` ${normalizeText(`${title} ${content}`)} `;
  const tokens = queryTokens(query.query);
  const phrases = quotedPhrases(query.query);

  const tokenHits = tokens.reduce((sum, token) => sum + (text.includes(` ${token} `) ? 1 : 0), 0);
  const tokenCoverage = tokens.length > 0 ? tokenHits / tokens.length : 0;
  const phraseHits = phrases.reduce((sum, phrase) => sum + (text.includes(` ${phrase} `) ? 1 : 0), 0);
  const engineScore = typeof item.score === "number" && Number.isFinite(item.score) ? Math.max(0, item.score) : 0;

  return phraseHits * 3 + tokenCoverage * 2 + Math.min(1, engineScore) * 0.5;
};

const fallbackSearchQuery = (value: string): string => {
  const tokens = value
    .replace(/[?"'()[\]{}:,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const reduced = tokens.filter((token) => !SEARCH_STOPWORDS.has(token.toLowerCase()));
  const selected = reduced.length >= 3 ? reduced : tokens;
  return selected.slice(0, 18).join(" ");
};

const normalizeUnresponsive = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!Array.isArray(entry) || entry.length === 0) return [];
    const engine = typeof entry[0] === "string" ? entry[0] : "unknown";
    const reason = typeof entry[1] === "string" ? entry[1] : "unresponsive";
    return [`${engine}: ${reason}`];
  });
};

export class SearxngSearchProvider implements SearchProvider {
  readonly name = "searxng-local-v4";

  constructor(
    private readonly baseUrl = process.env.SEARXNG_URL ?? "http://127.0.0.1:8888",
    private readonly timeoutMs = Number(process.env.ZERO_ONE_SEARXNG_TIMEOUT_MS ?? 10_000),
    private readonly categories = process.env.ZERO_ONE_SEARXNG_CATEGORIES ?? "general,news",
  ) {}

  private async fetchItems(searchQuery: string): Promise<SearxngFetchResult> {
    const endpoint = new URL("/search", this.baseUrl.replace(/\/$/, ""));
    endpoint.searchParams.set("q", searchQuery);
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("categories", this.categories);

    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(Number.isFinite(this.timeoutMs) ? this.timeoutMs : 10_000),
    });
    if (!response.ok) throw new Error(`SearXNG request failed: ${response.status} ${await response.text()}`);

    const payload = await response.json() as SearxngResponse;
    if (!Array.isArray(payload.results)) throw new Error("SearXNG response JSON shape invalid");
    return {
      items: payload.results as SearxngItem[],
      unresponsive: normalizeUnresponsive(payload.unresponsive_engines),
    };
  }

  private toRecords(items: SearxngItem[], query: ResearchQuery, observedAtMs: number): SearchResultRecord[] {
    const maxResults = Math.max(0, Math.min(query.maxResults, 8));
    const candidates: Array<{ raw: SearxngItem; url: URL; rank: number }> = [];

    for (const raw of items.slice(0, 40)) {
      if (!raw || typeof raw.title !== "string" || typeof raw.url !== "string") continue;

      let url: URL;
      try {
        url = new URL(raw.url);
      } catch {
        continue;
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      if (!matchesDomain(url, query.includeDomains)) continue;
      if (!raw.title.trim()) continue;

      candidates.push({ raw, url, rank: relevanceScore(raw, query) });
    }

    candidates.sort((a, b) => b.rank - a.rank);
    const records: SearchResultRecord[] = [];

    for (const { raw, url } of candidates.slice(0, maxResults)) {
      const title = (raw.title as string).trim();
      const snippet = typeof raw.content === "string" ? raw.content.trim() : "";
      const content = snippet || `Search result title: ${title}`;
      const score = typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : null;
      const publishedAtMs = parsePublished(raw.publishedDate ?? raw.published_date);
      const base = {
        queryId: query.id,
        queryIntent: query.intent,
        provider: this.name,
        title,
        url: url.toString(),
        content,
        score,
        publishedAtMs,
        observedAtMs,
      };
      records.push({ schemaVersion: "0-1.search-result.v1", id: sha256Json(base), ...base });
    }

    return records;
  }

  async search({ query }: SearchRequest): Promise<SearchResultRecord[]> {
    const observedAtMs = Date.now();
    const primaryFetch = await this.fetchItems(query.query);
    const primary = this.toRecords(primaryFetch.items, query, observedAtMs);
    if (primary.length > 0) return primary;

    const fallback = fallbackSearchQuery(query.query);
    let fallbackFetch: SearxngFetchResult | null = null;
    if (fallback && fallback !== query.query) {
      fallbackFetch = await this.fetchItems(fallback);
      const retried = this.toRecords(fallbackFetch.items, query, observedAtMs);
      if (retried.length > 0) return retried;
    }

    const blockers = [...new Set([
      ...primaryFetch.unresponsive,
      ...(fallbackFetch?.unresponsive ?? []),
    ])];
    const detail = blockers.length > 0 ? `; upstream=${blockers.join(" | ")}` : "";
    throw new Error(`SearXNG returned no usable results for ${query.intent} after bounded fallback${detail}`);
  }
}
