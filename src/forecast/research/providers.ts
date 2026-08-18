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
  if (requested === "agentrouter" || (!requested && process.env.AGENTROUTER_API_KEY)) {
    opinion = new AgentRouterOpinionProvider();
  } else if (requested === "openai" || (!requested && process.env.OPENAI_API_KEY)) {
    opinion = new OpenAIOpinionProvider();
  } else {
    throw new Error("No opinion provider configured. Set AGENTROUTER_API_KEY + ZERO_ONE_AGENTROUTER_MODEL or OPENAI_API_KEY.");
  }

  return {
    search: searchProviders.length === 1 ? searchProviders[0]! : new CompositeSearchProvider(searchProviders),
    opinion,
  };
}
