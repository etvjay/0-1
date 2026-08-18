# 0-1 Build Order

This order is intentionally competition-driven. Do not broaden the product until the current gate is green.

## M0 — Competition kernel

Goal: prove that 0-1 can read Delphi competition markets and reason about executable LMSR edge without signing.

Deliverables:
- competition-testnet client;
- open-market scanner;
- quote ladder through `quoteBuy`;
- `MarketBelief` schema;
- deterministic `TradeProposal | Refusal` evaluation;
- tests for stale belief, stale quote, insufficient edge, price impact, exposure and belief binding.

Gate:
- `npm run check` passes;
- `npm run scan` returns live competition markets when credentials/network are available.

## M1 — Replay and market archive

Goal: stop reasoning only from the current moment.

Deliverables:
- append-only market snapshots;
- trade/subgraph ingestion;
- settlement outcome records;
- replay clock;
- no-future-data enforcement;
- Brier/log-loss/P&L metrics.

Source primitives:
- Opportunity Foundry temporal holdout and outcome-ledger semantics;
- Corridor restart/checkpoint patterns.

Gate:
- one historical market can be replayed from observations to settlement without future leakage.

## M2 — Forecasting verticals

Goal: establish actual probability-estimation competence.

Start with narrow market classes rather than one generic LLM:
1. crypto threshold/time markets — quantitative price/volatility model;
2. sports/live event markets — CompetitionOS-style source resolution;
3. public-event/news markets — Research Foundry evidence pipeline.

Each forecaster returns:
- probability;
- confidence;
- evidence;
- method/version;
- invalidation conditions;
- expiry.

Gate:
- temporal holdout metrics beat the naive market-following and 50/50 baselines on at least one supported class before autonomous execution.

## M3 — Council and calibration

Goal: combine forecasts without flattening disagreement.

Deliverables:
- independent forecast records;
- adversarial/opposition forecast;
- calibration weights from prior resolved predictions;
- disagreement-aware aggregation;
- refusal when disagreement/ambiguity exceeds policy.

Source primitives:
- Thinking Reed Council;
- RJP bounded judgment;
- Research Foundry OPPOSE/BENCHMARK/TEST.

## M4 — Capital controller

Goal: turn a valid belief into bounded capital allocation.

Deliverables:
- Cinch-derived exposure/drawdown budgets;
- quote-aware optimal-size search;
- per-market and portfolio concentration controls;
- daily/competition loss limits;
- kill switch;
- signed or hashed trade-intent receipt.

Gate:
- shadow mode produces valid proposals/refusals for a full session with zero policy escapes.

## M5 — Live Delphi execution

Goal: execute the smallest safe real competition loop.

Deliverables:
- signer isolated from forecasting/model context;
- token allowance management;
- quote immediately before execution;
- slippage bound;
- idempotency/duplicate prevention;
- confirmed transaction receipt;
- position reconciliation;
- redeem/liquidate sweeper.

Gate:
- one deliberately small competition trade lands, is indexed, reconciles locally, and leaves a complete decision-to-transaction trace.

## M6 — Execution memory

Goal: make resolved prior trades capable of changing later decisions.

Source primitive: Engram.

Deliverables:
- `ExecutionEpisode` adapter for Delphi trades;
- memory admission only after outcome evidence;
- comparable-market recall;
- memory-on vs memory-off experiment;
- provenance showing when prior experience changes size, abstention or forecast method.

## M7 — Competitor intelligence

Goal: use public competition activity as evidence without blindly copying.

Deliverables:
- public trade-flow profiler;
- per-agent market specialization;
- response-lag analysis;
- crowd concentration/contrarian features;
- ablation test for competitor-signal lift.

Competitor activity is a feature, not truth.

## M8 — Always-on operations

Goal: keep the agent reliable for the remaining competition window.

Deliverables:
- AWS EC2 deployment;
- process supervisor;
- restart-safe checkpoints;
- structured logs;
- health endpoint/heartbeat;
- secret isolation;
- crash alerting;
- end-of-market settlement sweeps.

## Competition invariant

Every consequential path must preserve:

```text
observation
→ evidence
→ belief
→ quote
→ execution-edge calculation
→ policy decision
→ transaction or refusal
→ observed outcome
→ evaluation
```

A model response is not a trade. A spot edge is not an executable edge. A transaction hash is not proof of profit. A later win does not prove the forecast process was calibrated.
