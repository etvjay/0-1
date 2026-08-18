import type { SearchProvider, SearchRequest, SearchResultRecord } from "./types.js";

export class CompositeSearchProvider implements SearchProvider {
  readonly name = "composite-search-v1";
  constructor(private readonly providers: SearchProvider[]) {
    if (providers.length === 0) throw new Error("CompositeSearchProvider requires at least one provider");
  }

  async search(request: SearchRequest): Promise<SearchResultRecord[]> {
    const settled = await Promise.allSettled(this.providers.map((provider) => provider.search(request)));
    return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }
}
