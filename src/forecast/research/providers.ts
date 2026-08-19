import type { OpinionProvider, SearchProvider } from "./types.js";
import { AgentRouterOpinionProvider } from "./agentrouter-opinion.js";
import { CambrianCryptoSearchProvider } from "./cambrian-search.js";
import { CompositeSearchProvider } from "./composite-search.js";
import { HermesOpinionProvider } from "./hermes-opinion.js";
import { HermesSearchProvider } from "./hermes-search.js";
import { OpenAIOpinionProvider } from "./openai-opinion.js";
import { SearxngSearchProvider } from "./searxng.js";
import { TavilySearchProvider } from "./tavily.js";

export interface ResearchProviders {
  search: SearchProvider;
  opinion: OpinionProvider;
}

export function createResearchProviders(): ResearchProviders {
  const requestedSearch = (process.env.ZERO_ONE_SEARCH_PROVIDER ?? "").toLowerCase();
  const searchProviders: SearchProvider[] = [];

  if (requestedSearch === "searxng") {
    searchProviders.push(new SearxngSearchProvider());
    if (process.env.CAMBRIAN_API_KEY) searchProviders.push(new CambrianCryptoSearchProvider());
  } else if (requestedSearch === "hermes") {
    searchProviders.push(new HermesSearchProvider());
    if (process.env.CAMBRIAN_API_KEY) searchProviders.push(new CambrianCryptoSearchProvider());
  } else if (requestedSearch === "tavily") {
    searchProviders.push(new TavilySearchProvider());
    if (process.env.CAMBRIAN_API_KEY) searchProviders.push(new CambrianCryptoSearchProvider());
  } else if (requestedSearch === "cambrian") {
    searchProviders.push(new CambrianCryptoSearchProvider());
  } else if (requestedSearch) {
    throw new Error(`Unsupported ZERO_ONE_SEARCH_PROVIDER=${requestedSearch}`);
  } else {
    if (process.env.SEARXNG_URL) searchProviders.push(new SearxngSearchProvider());
    else if (process.env.HERMES_API_KEY) searchProviders.push(new HermesSearchProvider());
    else if (process.env.TAVILY_API_KEY) searchProviders.push(new TavilySearchProvider());
    if (process.env.CAMBRIAN_API_KEY) searchProviders.push(new CambrianCryptoSearchProvider());
  }

  if (searchProviders.length === 0) {
    throw new Error("No research search provider configured. Set SEARXNG_URL, HERMES_API_KEY, TAVILY_API_KEY, and/or CAMBRIAN_API_KEY.");
  }

  const requestedOpinion = (process.env.ZERO_ONE_OPINION_PROVIDER ?? "").toLowerCase();
  let opinion: OpinionProvider;

  if (requestedOpinion === "hermes") {
    opinion = new HermesOpinionProvider();
  } else if (requestedOpinion === "agentrouter") {
    opinion = new AgentRouterOpinionProvider();
  } else if (requestedOpinion === "openai") {
    opinion = new OpenAIOpinionProvider();
  } else if (requestedOpinion) {
    throw new Error(`Unsupported ZERO_ONE_OPINION_PROVIDER=${requestedOpinion}`);
  } else if (process.env.HERMES_API_KEY) {
    opinion = new HermesOpinionProvider();
  } else if (process.env.OPENAI_API_KEY) {
    opinion = new OpenAIOpinionProvider();
  } else if (process.env.AGENTROUTER_API_KEY) {
    opinion = new AgentRouterOpinionProvider();
  } else {
    throw new Error("No opinion provider configured. Set HERMES_API_KEY or another supported opinion provider credential.");
  }

  return {
    search: searchProviders.length === 1 ? searchProviders[0]! : new CompositeSearchProvider(searchProviders),
    opinion,
  };
}
