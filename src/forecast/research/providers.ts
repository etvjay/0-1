import type { OpinionProvider, SearchProvider } from "./types.js";
import { AgentRouterOpinionProvider } from "./agentrouter-opinion.js";
import { CambrianCryptoSearchProvider } from "./cambrian-search.js";
import { CompositeSearchProvider } from "./composite-search.js";
import { OpenAIOpinionProvider } from "./openai-opinion.js";
import { TavilySearchProvider } from "./tavily.js";

export interface ResearchProviders {
  search: SearchProvider;
  opinion: OpinionProvider;
}

export function createResearchProviders(): ResearchProviders {
  const searchProviders: SearchProvider[] = [];
  if (process.env.TAVILY_API_KEY) searchProviders.push(new TavilySearchProvider());
  if (process.env.CAMBRIAN_API_KEY) searchProviders.push(new CambrianCryptoSearchProvider());
  if (searchProviders.length === 0) {
    throw new Error("No research search provider configured. Set TAVILY_API_KEY and/or CAMBRIAN_API_KEY.");
  }

  const requested = (process.env.ZERO_ONE_OPINION_PROVIDER ?? "").toLowerCase();
  let opinion: OpinionProvider;

  if (requested === "agentrouter") {
    opinion = new AgentRouterOpinionProvider();
  } else if (requested === "openai") {
    opinion = new OpenAIOpinionProvider();
  } else if (requested) {
    throw new Error(`Unsupported ZERO_ONE_OPINION_PROVIDER=${requested}`);
  } else if (process.env.OPENAI_API_KEY) {
    // Prefer a directly configured working provider. AgentRouter is opt-in while its route is unstable.
    opinion = new OpenAIOpinionProvider();
  } else if (process.env.AGENTROUTER_API_KEY) {
    opinion = new AgentRouterOpinionProvider();
  } else {
    throw new Error("No opinion provider configured. Set ZERO_ONE_OPINION_PROVIDER plus the matching provider credentials.");
  }

  return {
    search: searchProviders.length === 1 ? searchProviders[0]! : new CompositeSearchProvider(searchProviders),
    opinion,
  };
}
