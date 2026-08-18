# 0-1 Build Order

This is the canonical competition roadmap. It is intentionally execution-driven: 0-1 should operate as early as possible and improve while running.

## Architectural boundary

0-1 does not need to reimplement Delphi mechanics already provided by the official Agentic Trading Toolkit (ATT) and `@gensyn-ai/gensyn-delphi-sdk`.

ATT / Delphi SDK provide the paved operational substrate:
- list/search markets;
- live market details and probabilities;
- quote buy/sell;
- token approval;
- buy/sell execution;
- wallet positions and balances;
- historical/subgraph events;
- redeem settled positions;
- liquidate expired/failed positions.

0-1 owns the layer above that substrate:
- resolution semantics;
- evidence collection;
- forecasting;
- opposition and calibration;
- opportunity discovery;
- capital policy;
- persistent autonomous execution;
- decision and execution memory;
- competitor intelligence.

Competition markets use LMSR and TST on `competition-testnet`; regular Delphi testnet/mainnet markets use DPM. Never apply DPM payout/price semantics to the competition runtime.

---

## M0 — Competition kernel ✅ implemented

Goal: reason about executable competition edge without allowing model output to become a trade implicitly.

Implemented:
- `competition-testnet` client;
- open-market scanner;
- exact `quoteBuy` ladder;
- `MarketBelief` schema;
- deterministic `TradeProposal | Refusal` evaluation;
- freshness, confidence, execution-edge, price-impact and exposure gates.

Truth gate still required on deployment:
- `npm run check` passes in the actual runtime checkout;
- live competition market reads work with the configured API key.

## M1 — Archive, replay and outcome scoring ✅ implemented foundation

Goal: stop reasoning only from the current moment and make later evaluation possible.

Implemented:
- trade/subgraph ingestion;
- settlement/failure records;
- market catalog and indexing checkpoint;
- append-only observations;
- cutoff-safe replay;
- forecast ledger;
- Brier/log-loss and market-relative scoring.

Operational gate:
- replay at least one real settled competition market end-to-end without future leakage.

## M2 — Forecasting and opportunity intelligence

### M2a — Specialist baseline ✅

Crypto terminal-threshold forecaster exists as one optional specialist, not the system architecture.

### M2b — General evidence forecasting ✅

Implemented:
- domain + event-archetype router;
- `ResolutionSpec`;
- evidence normalization;
- provider-independent search/opinion interfaces;
- ADVOCATE and OPPOSE judgments;
- Evidence Council;
- autonomous research adapter;
- explicit refusals for stale, ambiguous, unsupported or excessively disputed forecasts.

### M2c — Opportunity Hunter ✅

Implemented:
- scan all open competition markets;
- cheap metadata triage;
- bounded research budget;
- one primary research target per market;
- autonomous research of best candidates;
- fresh prior check after research;
- binary complement evaluation when mathematically valid;
- exact quote-aware opportunity ranking;
- persistent hunt reports and forecast records.

### M2d — Persistent autonomous runtime 🟡 current milestone

Goal: operate continuously now rather than waiting for later milestones.

Implemented:
- `npm run compete`;
- `npm run compete:loop`;
- durable runtime state;
- single-process lock;
- pending execution journal;
- at-least-once retry semantics;
- multi-opportunity live cycles bounded by TST spend;
- per-market/outcome cooldown;
- kill switch;
- systemd service;
- Ubuntu/EC2 install script.

Operational gate:
- deploy to the always-on host;
- pass `npm run check` there;
- complete sustained shadow cycles;
- restart the host/process and prove state recovery;
- then enable bounded live execution.

The runtime does not wait for M3-M5 to be perfect. Improvements are deployed while this process continues to operate.

## M3 — Calibration and forecast improvement

Goal: learn what 0-1 is actually good at from resolved forecasts.

Deliverables:
- calibration by probability bucket;
- Brier/log-loss by method, domain and archetype;
- market-relative skill;
- source/provider reliability estimates;
- council/opposition weight updates;
- confidence correction;
- specialist selection from observed live opportunity distribution.

M3 does not block live operation.

## M4 — Capital controller

Goal: replace crude fixed caps with better bounded allocation across simultaneously actionable opportunities.

Current live safety already exists:
- per-order TST cap;
- per-cycle TST cap;
- position-fraction gate;
- price-impact gate;
- kill switch.

Remaining deliverables:
- actual wallet balance/position ingestion;
- available-capital calculation;
- per-market exposure from live positions rather than static env input;
- correlation/shared-underlying controls;
- quote-aware size search;
- competition-horizon-aware allocation;
- loss/drawdown limits.

## M5 — ATT-backed full position and execution lifecycle

Goal: complete the live lifecycle using the official ATT/Delphi SDK paved paths instead of rebuilding them.

Already pulled forward:
- bounded `quoteBuy -> ensureTokenApproval -> buyShares` path;
- fresh market + fresh quote revalidation;
- slippage cap;
- durable execution receipt;
- at-least-once pending execution state.

Remaining:
- ingest real wallet positions;
- hold/add/sell decisions;
- `quoteSell` + `sellShares`;
- position reconciliation after each transaction;
- detect settled markets and redeem;
- detect expired/failed markets and liquidate;
- reconcile ambiguous submissions against chain/subgraph before retry;
- isolate signer credentials from forecasting/model context as deployment permits.

Gate:
- live daemon executes, indexes and reconciles real trades and can exit/settle positions without manual intervention.

## M6 — Resolution-proximity and event watchers

Goal: react faster when uncertainty collapses.

Examples:
- official announcement pages;
- live sports state;
- election/result feeds;
- macro releases;
- regulatory/court decisions;
- product launches.

Pattern:

```text
cheap watcher
-> meaningful state change?
   no  -> continue
   yes -> immediate research/forecast/quote cycle
```

This is likely higher competition value than blindly increasing generic polling frequency.

## M7 — Execution memory

Goal: make resolved prior trades capable of changing later decisions.

Source primitive: Engram.

Deliverables:
- `ExecutionEpisode` adapter;
- outcome-backed memory admission;
- comparable-market recall;
- memory-on vs memory-off experiment;
- provenance showing when prior experience changes forecast, size or abstention.

## M8 — Competitor intelligence

Goal: use public competition activity as evidence without blindly copying.

Deliverables:
- public wallet trade-flow profiler;
- reconstructed historical performance;
- market specialization;
- early/correct mover analysis;
- response-lag and lead/lag features;
- crowd concentration/contrarian features;
- ablation test for competitor-signal lift.

Competitor activity is a feature, not truth.

## M9 — Adaptive runtime

Goal: let observation cadence follow information conditions.

```text
quiet market              -> slower polling
near resolution           -> faster polling
evidence/source changed   -> immediate forecast
large market repricing    -> immediate re-evaluation
new market                -> immediate triage
```

This replaces a fixed interval only after the basic persistent loop is proven.

## Competition invariant

Every consequential path preserves:

```text
observation
-> evidence
-> belief
-> fresh market state
-> exact quote
-> execution-edge calculation
-> capital/policy decision
-> transaction or refusal
-> position / settlement observation
-> evaluation
-> later improvement
```

A model response is not a trade. A spot edge is not executable edge. A transaction hash is not proof of profit. A later win does not prove the forecasting process was calibrated.
