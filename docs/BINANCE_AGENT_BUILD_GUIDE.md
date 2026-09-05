# 0-1 Binance Agent Build Guide

## Purpose

This is the single operational guide for building the Binance Agent OS adaptation of 0-1 without confusing it with the existing Delphi competition system.

## 1. Venue boundary

0-1 is the common product thesis. Delphi and Binance are separate venue implementations.

```text
                    0-1 CORE
 evidence → opposition → council → bounded decision
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
       DELPHI                  BINANCE
 prediction market         trading venue / Agent OS
```

## 2. Delphi-specific semantics

Keep Delphi-only unless deliberately generalized:

```text
competition-testnet
Delphi market address / outcome index
MarketBelief probability
market-implied probability
LMSR
quoteBuy / quoteSell
shares
TST spend
average quoted execution price
winning-share redemption
Brier/log-loss prediction-market scoring
Delphi SDK / ATT lifecycle
```

Do not carry LMSR, `outcomeIndex`, TST, prediction-market settlement, or Delphi market identifiers into Binance logic.

## 3. Binance-specific semantics

Binance owns:

```text
Agent OS / Agentic sub-account
selected Binance product family
symbol / instrument
BTCUSDT / ETHUSDT initial scope
LONG / SHORT / NO_TRADE
mark price / bid / ask
order book depth
spread / slippage / fees / funding
position / account state
open orders
acknowledgements / fills / cancellation
client order identity
reconciliation
order filters / limits / permissions
```

Use current official Binance documentation for the exact selected product family. Never silently mix Spot, Margin, USD-M Futures, COIN-M Futures, Portfolio Margin, or Options.

## 4. Shared 0-1 invariants

```text
observation ≠ evidence
evidence ≠ thesis
thesis ≠ executable edge
executable edge ≠ authority
authority ≠ execution
```

Shared ideas include bounded triage, evidence provenance, ADVOCATE/OPPOSE, deterministic Council, refusal as valid outcome, freshness bounds, execution-adjusted economics, ledgers, replay/evaluation, and model-output/action separation.

## 5. Binance product

> 0-1 for Binance converts slower evidence-backed reasoning into short-lived immutable execution mandates. A deterministic low-latency runtime may exercise a mandate only while fresh Binance market/account state still satisfies the mandate's economic, freshness, risk and authority constraints.

`ExecutionMandate` is not an order.

## 6. Decisive workflow

```text
Opportunity
→ cheap triage
→ parallel evidence / oppose / market analysis
→ Evidence Council
→ TradeThesis | REFUSE
→ compileMandate()
→ immutable ExecutionMandate
→ ARMED
→ continuous Binance state
→ trigger
→ evaluateMandate()
→ ExecutionIntent | ExecutionRefusal
→ single OrderWriter
→ ACK/fills/cancel
→ reconciliation
→ ledger/outcome
```

## 7. Three planes

```text
REASONING PLANE
candidate → research → advocate/oppose/market → Council → thesis → mandate

HOT DATA PLANE
live market/account state → versions → trigger → deterministic validation/economics

EXECUTION PLANE
one OrderWriter → durable submission → exchange → acknowledgement/fills → reconciliation
```

Reasoning never sends orders. Hot path never calls an LLM. Only execution owns exchange writes.

## 8. Mandatory read order

```text
1. docs/BINANCE_AGENT_BUILD_GUIDE.md
2. docs/canonical/BINANCE_SOURCE_TRUTH.md
3. docs/canonical/GROUND_TRUTH.md
4. docs/canonical/PRODUCT_SPEC.md
5. docs/canonical/PRODUCT_SCHEMA.md
6. docs/canonical/ARCHITECTURE.md
7. docs/canonical/WORKFLOWS.md
8. docs/canonical/REQUIREMENTS.md
9. docs/development/INVARIANTS.md
10. docs/development/INTERFACES.md
11. docs/development/AUTHORITY_MAP.md
12. docs/development/STATE_MACHINES.md
13. current Change Record
```

## 9. Truth split

```text
0-1 canonical docs → what product we build
official Binance docs → what Binance supports/how it behaves
assigned branch → what currently exists in code
Change Record → what this agent may change
```

If Binance capability conflicts with 0-1 architecture, emit `SOURCE_CONFLICT` and stop that slice for review.

## 10. Build order

```text
M-B0 Canonicalization                 ✅
M-B1 Mandate Kernel                   ← current
M-B2 Binance State Plane              live read / no write
M-B3 Execution Economics              shadow assessment
M-B4 Binance Reasoning Workflow       end-to-end shadow
M-B5 OrderWriter + Reconciliation     controlled canary
M-B6 Full Workflow Runtime            recovery/reconciliation
M-B7 Sustained Shadow Evidence
M-B8 Controlled Live Evidence + submission freeze
```

### M-B1

```text
TradeThesis
→ compileMandate()
→ ExecutionMandate
→ MandateStore
→ state machine
→ evaluateMandate()
→ ExecutionIntent | ExecutionRefusal
```

Proof ceiling: `LOCAL_PASS`. No Binance live claim.

## 11. Hard invariants

```text
REASONING NEVER SENDS ORDERS.
HOT PATH NEVER CALLS AN LLM.
ONLY ONE COMPONENT OWNS EXCHANGE WRITE AUTHORITY.
MANDATES ARE IMMUTABLE.
SUPERSEDED/EXPIRED/REVOKED/USED MANDATES CANNOT EXECUTE.
MANDATE IS CONSUMED BEFORE OUTBOUND ORDER I/O.
EXECUTION USES CURRENT BINANCE STATE.
EXECUTABLE EDGE MUST STILL EXIST AT SUBMISSION.
STALE MARKET/ACCOUNT STATE FAILS CLOSED.
UNKNOWN SUBMISSION STATE NEVER CAUSES BLIND RETRY.
EVERY ORDER BINDS TO ONE MANDATE.
EVERY MANDATE BINDS TO ONE THESIS/COUNCIL DECISION.
```

## 12. Code separation target

Do not delete Delphi. Evolve incrementally toward:

```text
src/
├── domain/
├── forecast/
├── runtime/
├── venues/
│   ├── delphi/
│   └── binance/
├── strategies/
│   ├── delphi/
│   └── directional/
└── ledger/
```

Temporary `src/binance/**` is acceptable during M-B1/M-B2 if it avoids destabilizing Delphi.

## 13. Never do this

- rename Delphi concepts and pretend they are Binance concepts;
- copy `MarketBelief.probability` into Binance directional logic;
- use `outcomeIndex` for Binance;
- use LMSR semantics for Binance order books;
- mix Spot/Futures docs;
- let worker agents place orders;
- claim live behavior from mocks;
- claim alpha from one winning trade.

## Governing maxim

```text
Pull product meaning from 0-1.
Pull exchange behavior from Binance.
Pull implementation scope from the Change Record.
Pull current code from the assigned branch.
```