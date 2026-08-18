# Research Providers

0-1 separates research/search providers from opinion/model providers. The Evidence Council and execution path do not depend on a specific LLM vendor.

## Default model gateway: AgentRouter

Set:

```dotenv
ZERO_ONE_OPINION_PROVIDER=agentrouter
AGENTROUTER_API_KEY=
AGENTROUTER_BASE_URL=https://co.agentrouter.org/v1
ZERO_ONE_AGENTROUTER_MODEL=<exact model id available to your AgentRouter key>
```

`AgentRouterOpinionProvider` uses the OpenAI-compatible chat-completions protocol. It does not trust provider-native structured-output enforcement: the model is instructed to return one JSON object and 0-1 validates probability, confidence, evidence IDs and field shape locally before admitting the opinion.

`OPENAI_API_KEY` remains an optional fallback when `ZERO_ONE_OPINION_PROVIDER=openai`.

## Search/data composition

Search providers can be composed. Currently:

- `TavilySearchProvider`: general web evidence.
- `CambrianCryptoSearchProvider`: structured on-chain financial evidence for explicitly mapped crypto assets.

When both keys exist, `CompositeSearchProvider` runs both and merges successful results. Provider failure is not converted into fabricated evidence.

## Cambrian

Set:

```dotenv
CAMBRIAN_API_KEY=
CAMBRIAN_BASE_URL=https://opabinia.cambrian.network/api/v1
ZERO_ONE_CAMBRIAN_TOKEN_MAP={"SOL":{"network":"solana","address":"So11111111111111111111111111111111111111112"}}
```

The token map is intentionally explicit. 0-1 never guesses a contract or mint address from a ticker.

Current adapter behavior:

### Solana mapping

For a configured symbol present in a research query, 0-1 requests:

```text
GET /solana/price-current?token_address=<address>
GET /solana/trade-statistics?token_addresses=<address>&timeframe=24h
```

### EVM mapping

For a configured symbol:

```text
GET /evm/price-current?token_address=<address>
```

More Cambrian endpoints can be added when a Delphi market archetype actually benefits from them; the runtime does not blindly fetch the full API surface.

Cambrian results are normalized as `DATA_FEED` evidence with a shared `independenceGroup="cambrian"`. Multiple Cambrian endpoints therefore add detail without pretending to be independent sources.

## Runtime selection

`npm run research:market`, `npm run hunt`, `npm run compete`, and `npm run compete:loop` all use `createResearchProviders()`.

Selection rules:

1. If `TAVILY_API_KEY` exists, general web search is enabled.
2. If `CAMBRIAN_API_KEY` exists, Cambrian crypto evidence is enabled.
3. At least one search/data provider must be configured.
4. If `ZERO_ONE_OPINION_PROVIDER=agentrouter`, AgentRouter is used.
5. If no opinion provider is explicitly selected, AgentRouter is preferred when its key exists; OpenAI is the fallback when its key exists.

## Evidence boundary

Cambrian data is financial evidence, not a Delphi probability. AgentRouter model output is an opinion, not a trade. Both still flow through:

```text
evidence
-> bounded forecast opinions
-> Evidence Council
-> fresh Delphi probability
-> exact quote
-> deterministic policy
-> execution or refusal
```
