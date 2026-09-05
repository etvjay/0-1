# 0-1 Ground Truth

**Project:** 0-1  
**Target adaptation:** Binance Agent OS Track A  
**Ground Truth version:** 0.1  
**Status:** Binance adaptation is **TARGET / NOT YET IMPLEMENTED** unless explicitly promoted below.

## Product identity

0-1 is an **evidence-bounded trading-agent execution system**. Its core job is to prevent a model opinion, forecast, or narrative from silently becoming a financial action.

```text
OPINION ≠ TRADE

observation ≠ evidence
evidence ≠ thesis
thesis ≠ executable edge
executable edge ≠ authority
authority ≠ execution
transaction receipt ≠ profitable outcome
```

## Current implemented truth

The current repository implements the Delphi competition system: market discovery, `MarketBelief`, deterministic `TradeProposal | TradeRefusal`, quote-aware execution-edge gates, archive/replay, forecast scoring, autonomous evidence research, ADVOCATE/OPPOSE, deterministic Evidence Council, bounded opportunity triage, and a persistent runtime. The Binance adaptation is not yet implemented.

## Canonical boundaries

- Research may retrieve/normalize evidence and form opinions, but never place orders or bypass Council.
- Evidence Council consumes structured evidence/opinions and returns accepted thesis or refusal; refusal is valid.
- Execution must revalidate against current market/account state; reasoning-time state is insufficient.

## Binance target product

The Binance version converts slower evidence-backed reasoning into **short-lived immutable execution mandates**. A deterministic low-latency runtime may exercise a mandate only while current Binance market/account state still satisfies freshness, economic, entry, cost, exposure, authority, expiry and invalidation bounds.

## Hard authority rules

1. Reasoning never sends orders.
2. The hot path never calls an LLM.
3. Only one component owns exchange write authority.
4. A mandate is immutable after issuance.
5. MVP mandates are single-use.
6. Superseded, revoked, consumed or expired mandates cannot execute.
7. Execution uses current market/account state.
8. Executable edge must still exist at submission.
9. Stale market/account state fails closed.
10. Unknown submission state never causes a blind retry.
11. Every order is traceable to one mandate.
12. Every mandate is traceable to one thesis/council decision.

## Workflow

```text
DISCOVERED → RESEARCHING → COUNCIL_REVIEW
→ THESIS_ACCEPTED | THESIS_REFUSED
→ MANDATE_ISSUED → ARMED → TRIGGERED → VALIDATING
→ SUBMITTING → ACKNOWLEDGED → PARTIALLY_FILLED | FILLED
```

Alternative outcomes: `REFUSED`, `INVALIDATED`, `EXPIRED`, `SUPERSEDED`, `CANCELLED`, `FAILED`.

## Current Binance status

| Component | Status |
|---|---|
| Product definition / invariants / workflow | CANONICAL |
| `TradeThesis` / `ExecutionMandate` schemas | CANONICAL TARGET |
| Binance market/account adapters | NOT IMPLEMENTED |
| Execution-cost model / order writer / reconciliation | NOT IMPLEMENTED |
| Live Binance read evidence | UNVERIFIED |
| Shadow Binance workflow | UNVERIFIED |
| Live bounded Binance order | UNVERIFIED |
| Profitable alpha | NOT CLAIMED |

## Evidence maturity

`UNVERIFIED → SIMULATED_PASS → LOCAL_PASS → SHADOW_PASS → TESTNET_PASS → LIVE_PASS → PUBLIC_EVALUATOR_PASS → PRODUCTION_PASS`.

Ground Truth promotion requires implementation + tests + negative tests + independent review + required runtime evidence.
