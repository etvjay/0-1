import { sha256Json } from "../../history/io.js";
import type { SearchProvider, SearchRequest, SearchResultRecord } from "./types.js";

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

export class SearxngSearchProvider implements SearchProvider {
  readonly name = "searxng-local-v1";

  constructor(
    private readonly baseUrl = process.env.SEARXNG_URL ?? "http://127.0.0.1:8888",
    private readonly timeoutMs = Number(process.env.ZERO_ONE_SEARXNG_TIMEOUT_MS ?? 10_000),
  ) {}

  async search({ query }: SearchRequest): Promise<SearchResultRecord[]> {
    const endpoint = new URL("/search", this.baseUrl.replace(/\/$/, ""));
    endpoint.searchParams.set("q", query.query);
    endpoint.searchParams.set("format", "json");

    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(Number.isFinite(this.timeoutMs) ? this.timeoutMs : 10_000),
    });
    if (!response.ok) throw new Error(`SearXNG request failed: ${response.status} ${await response.text()}`);

    const payload = await response.json() as SearxngResponse;
    if (!Array.isArray(payload.results)) throw new Error("SearXNG response JSON shape invalid");

    const observedAtMs = Date.now();
    const maxResults = Math.max(0, Math.min(query.maxResults, 8));
    const records: SearchResultRecord[] = [];

    for (const raw of payload.results as SearxngItem[]) {
      if (records.length >= maxResults) break;
      if (!raw || typeof raw.title !== "string" || typeof raw.url !== "string") continue;

      let url: URL;
      try {
        url = new URL(raw.url);
      } catch {
        continue;
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      if (!matchesDomain(url, query.includeDomains)) continue;

      const title = raw.title.trim();
      const content = typeof raw.content === "string" ? raw.content.trim() : "";
      if (!title || !content) continue;

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
}
