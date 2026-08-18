# Autonomous Research Module

## Purpose

Turn a routed Delphi market into a reproducible evidence packet and an `EvidenceForecastBundle` without allowing retrieval or a model response to authorize a trade.

## Runtime path

```text
Delphi market
→ routeMarket()
→ buildResearchPlan()
→ SearchProvider
→ SearchResultRecord[]
→ normalizeSearchEvidence()
→ OpinionProvider(ADVOCATE)
→ OpinionProvider(OPPOSE)
→ EvidenceForecastBundle
→ evaluateEvidenceCouncil()
→ FORECAST | REFUSED
```

The accepted forecast then enters the existing forecast ledger. Quote/risk/execution remains downstream and separate.

## Public interfaces

### `SearchProvider`

```ts
interface SearchProvider {
  readonly name: string;
  search(request: SearchRequest): Promise<SearchResultRecord[]>;
}
```

Current adapter: `TavilySearchProvider`.

### `OpinionProvider`

```ts
interface OpinionProvider {
  readonly name: string;
  forecast(request: OpinionRequest): Promise<ForecastOpinion>;
}
```

Current adapter: `OpenAIOpinionProvider` using Responses structured output.

## Query plan

Every market receives at least four independent query intents:

- `PRIMARY` — official/authoritative evidence;
- `CORROBORATE` — independent supporting/context evidence;
- `OPPOSE` — explicit search for contrary evidence;
- `BASE_RATE` — comparable historical/reference-class evidence.

Domain routing may add specialized queries for politics, sports, or economics.

## Evidence boundary

Search results are initially normalized as `CONTEXT`. Query intent is not treated as proof of stance. The advocate and opposition opinions must cite exact evidence IDs. This prevents a search query phrased as a contradiction from automatically becoming contradictory evidence.

Publisher hostname is the default `independenceGroup`, so duplicated/syndicated results from the same source cannot satisfy independent-source requirements multiple times.

## Persistence

`npm run research:market -- <market-address> [outcome-index]` stores a complete packet under:

```text
data/research/<market>-<outcome>-<timestamp>.json
```

If and only if the council returns `FORECAST`, a `0-1.forecast.v1` record is appended to `ZERO_ONE_FORECAST_LOG`.

## Environment

```text
TAVILY_API_KEY=
OPENAI_API_KEY=
ZERO_ONE_RESEARCH_MODEL=gpt-5.6
```

Adapters are replaceable. These provider choices are runtime defaults, not protocol semantics.

## Non-goals

This module does not:

- sign or execute transactions;
- treat market price as truth;
- assume retrieved text is correct;
- fabricate a fallback probability when retrieval/judgment fails;
- bypass `EvidenceCouncil` refusal policy.
