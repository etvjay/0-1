# Portfolio Asset Import Map

0-1 should reuse proven semantics and small modules from prior systems without turning into a monolithic merge of those repositories.

## Import rule

Prefer extraction/adaptation of a narrow primitive over wholesale repository copying.

Every imported module must record:
- source repository;
- source path/commit when pinned;
- semantic responsibility;
- modifications made for Delphi;
- tests proving the adapted boundary.

## S-tier imports

### Cinch / OTC Chronograph

Source: `Jaydearcadian/OTC-chronograph`

Use for:
- perception -> decision separation;
- strict structured decision validation;
- retry/fail-loudly model adapter pattern;
- tranche/exposure concepts;
- drawdown policy;
- execution receipts;
- capital-containment semantics.

Known source path:
- `agent/brain.ts` — provider-agnostic structured decision layer.

Do not import:
- Bitget execution semantics;
- Base-specific gatekeepers as-is.

Delphi adaptation:
- trade unit becomes LMSR shares;
- drawdown/exposure policy operates on TST account value/P&L;
- decision must bind marketId/outcome/belief version/quote freshness.

### Ecosystem Opportunity Foundry

Source: `etvjay/opportunity-foundry`

Use for:
- evidence-first candidate lifecycle;
- freshness/temporal truth;
- reconciliation/refusal;
- immutable outcome tracking;
- comparison baselines;
- temporal holdout evaluation;
- calibration discipline.

Delphi adaptation:
- Candidate -> MarketOpportunity;
- opportunity score -> expected executable edge / information value;
- paper evaluation -> historical market replay;
- outcome ledger -> resolved-market forecast/trade ledger.

### CompetitionOS

Source: `Jaydearcadian/competitionos`

Use for:
- polling daemon pattern;
- sports/event source adapters;
- multi-source cross-reference;
- confidence labels;
- content-hash provenance;
- LLM extraction as fallback, not authority.

Known source path:
- `sdk/resolver-bot.ts`
- supporting `sdk/sports-data.ts` when imported.

Delphi adaptation:
- never settle Delphi markets;
- resolver becomes EventObserver/ForecastEvidence source only.

### Noema

Source: `etvjay/Noema`

Use for:
- evidence-bounded object semantics;
- versioning;
- explicit freshness/provenance/conflict state;
- deterministic verification boundary;
- AI interpretation separated from verified observations.

Delphi adaptation:
- EconomicObject -> MarketBelief evidence bundle.

### Reactor

Source: `Jaydearcadian/reactor`

Use for:
- persistent objective semantics;
- exact-state trigger thinking;
- stale-state refusal;
- bounded execution authorization;
- postcondition receipt discipline.

Delphi adaptation:
- objective: trade only when belief + quote + portfolio conditions jointly hold;
- cheap event watchers trigger expensive inference only near an actionable state.

### 01 market maker

Source: `Jaydearcadian/zo-market-maker-ts`

Use for:
- Binance WebSocket ingestion;
- fair/reference price feed plumbing;
- position/account monitoring patterns;
- daemon/Docker operating patterns.

Do not import:
- CLOB market-making strategy.

Delphi adaptation:
- external prices become forecasting evidence for crypto threshold/time markets.

## A-tier imports

### iGraph

Source: `etvjay/iGraph`

Use for:
- signed bounded authority object;
- expiry;
- context fingerprint/binding;
- immediate pre-side-effect revalidation;
- postconditions.

Delphi adaptation:
- Impact Pact -> Trade Pact.

### Bifrost

Source: `Jaydearcadian/Bifrost`

Use for:
- quote-before-execute;
- deterministic policy engine;
- simulation/preflight;
- proof lifecycle.

Do not automatically port canary execution: in shallow LMSR markets the canary itself changes price materially.

### Engram

Source: `etvjay/Engram`

Use after resolved trade history exists:
- ExecutionEpisode;
- admission/retrieval/influence provenance;
- stale/incompatible memory rejection;
- memory-on vs memory-off counterfactual evaluation.

Delphi adaptation:
- each completed trade/abstention becomes an execution episode;
- memory must not directly authorize a trade.

### Corridor Radar

Source: `Jaydearcadian/corridor-radar`

Use for:
- restart-safe streaming;
- checkpoint/resume;
- normalize -> measure -> evaluate -> explain pipeline;
- dead-letter/retry patterns;
- materiality alerts.

### Shadow Market: Blackout

Source: `etvjay/Shadow-Market-Blackout`

Use for:
- deterministic baseline agent;
- provider adapters behind one validated structured-action boundary;
- server-side key separation;
- idempotency semantics;
- normalized market reporter pattern.

### Thinking Reed / RJP

Sources:
- `etvjay/Thinking-Reed`
- `Jaydearcadian/RJP`

Use for:
- opposition / Council pattern;
- bounded judgment;
- disagreement as explicit state;
- evidence -> interpretation -> local decision separation.

## B-tier primitives

### OpenRails

Source: `Jaydearcadian/mcosm-openrails`

Use selectively for:
- idempotent execution;
- nonce/replay isolation patterns;
- durable event indexing;
- receipts;
- SDK/REST/MCP interface conventions.

Do not import the commercial relationship domain.

## Explicitly deferred

Until forecasting/replay/execution are green, do not spend competition time porting:
- Concord/FCC;
- NOX ACCORD confidential coordination;
- One Spin;
- privacy/FHE systems;
- payment products;
- full portfolio UIs;
- custom onchain contracts not required by Delphi.

The competition needs alpha, bounded execution and operational reliability first.
