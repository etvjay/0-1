# 0-1 Binance Agent Build Guide

## Purpose

This is the single operational guide for building the Binance Agent OS adaptation of 0-1 without confusing it with the existing Delphi competition system.

It does **not** replace the canonical packet. It tells coding agents what to read, what belongs to Delphi, what belongs to Binance, what is shared, and in what order the Binance agent must be built and proven.

---

# 1. First Rule: Delphi and Binance Are Different Venues

0-1 is the common product thesis. Delphi and Binance are separate venue implementations.

```text
                    0-1 CORE

 evidence → opposition → council → bounded decision
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
       DELPHI                  BINANCE
 prediction market         trading venue / Agent OS
```

Do not copy venue mechanics across the boundary merely because both are trading systems.

---

# 2. What Is Delphi-Specific

The existing Delphi implementation owns semantics such as:

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
spot edge = our probability - market probability
execution edge = our probability - average quoted execution price
market settlement / redemption
Brier score / log loss on resolved prediction markets
Delphi SDK / ATT execution lifecycle
```

These concepts remain valid for Delphi only unless explicitly generalized.

Do not import the following into Binance code as if they were universal:

```text
LMSR probability semantics
outcomeIndex
winning share redemption
TST budgeting
quoteBuy(shares)
Delphi competition market IDs
prediction-market settlement assumptions
```

Existing Delphi code stays protected under its current modules, including `src/delphi/**` and the Delphi-specific runtime paths.

---

# 3. What Is Binance-Specific

The Binance adaptation owns venue semantics such as:

```text
Agent OS / Agentic sub-account
selected Binance product family
symbol / instrument
BTCUSDT / ETHUSDT initial scope
LONG / SHORT / NO_TRADE
mark price / bid / ask
order book depth
spread
slippage
fees
funding where applicable
position state
account balance / available capital
open orders
exchange acknowledgement
partial fills / fills / cancellation
client order identity
reconciliation
Binance order filters / limits / permissions
```

Binance code must use current official Binance documentation for the exact selected product family.

Never silently mix:

```text
Spot
Margin
USD-M Futures
COIN-M Futures
Portfolio Margin
Options
```

See `docs/canonical/BINANCE_SOURCE_TRUTH.md`.

---

# 4. What Is Shared Across Delphi and Binance

The shared 0-1 product invariants are:

```text
observation ≠ evidence
evidence ≠ thesis
thesis ≠ executable edge
executable edge ≠ authority
authority ≠ execution
```

Shared architectural ideas may include:

- bounded opportunity triage;
- autonomous evidence research;
- ADVOCATE / OPPOSE separation;
- evidence provenance;
- deterministic Evidence Council;
- refusal as a valid outcome;
- freshness bounds;
- execution-adjusted economics;
- append-only evidence/decision ledgers;
- replay/evaluation discipline;
- model output never directly becoming an exchange action.

Shared semantics must be generalized deliberately. Do not move Delphi-specific types into shared core merely because another venue needs a similar concept.

---

# 5. Binance Product Definition

0-1 for Binance is:

> An evidence-bounded trading-agent execution system that converts slower evidence-backed reasoning into short-lived immutable execution mandates. A deterministic low-latency runtime may exercise a mandate only while fresh Binance market/account state still satisfies the exact economic, freshness, risk and authority conditions that justified it.

Core primitive:

```text
ExecutionMandate
```

A mandate is **not** an order.

---

# 6. Binance Decisive Workflow

```text
Opportunity detected
        ↓
cheap triage
        ↓
parallel bounded analysis
├─ evidence / advocate
├─ oppose / countercase
└─ market analysis
        ↓
Evidence Council
        ↓
TradeThesis | REFUSE
        ↓
compileMandate()
        ↓
immutable ExecutionMandate
        ↓
ARMED
        ↓
continuous Binance market/account state
        ↓
trigger
        ↓
evaluateMandate()
        ↓
ExecutionIntent | ExecutionRefusal
        ↓
single OrderWriter
        ↓
ACK / fills / cancellation
        ↓
reconciliation
        ↓
ledger / outcome
```

---

# 7. Three Runtime Planes

## Reasoning Plane

Owns:

```text
candidate discovery
evidence retrieval
advocate
oppose
market analysis
Evidence Council
TradeThesis
mandate compilation
```

May not submit orders.

## Hot Data Plane

Owns:

```text
live market state
live account state
versioned state stores
trigger detection
current-state deterministic validation
execution economics
```

May not call an LLM or research provider.

## Execution Plane

Owns:

```text
one OrderWriter
submission persistence
exchange write
ack/fill/cancel observation
reconciliation
execution ledger
```

Only this plane may own exchange write authority.

---

# 8. Read Order for Every Binance Coding Agent

Before implementing a Binance task, read:

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

Then inspect the exact existing source files named by the task.

The Change Record controls what the agent may edit.

---

# 9. Source-of-Truth Split

Use this rule:

```text
0-1 canonical docs
→ determine WHAT product we are building

official Binance docs
→ determine WHAT Binance supports and HOW it behaves

assigned branch/source
→ determine WHAT currently exists in code

Change Record
→ determine WHAT this agent is authorized to change
```

None may substitute for another.

If official Binance capability conflicts with canonical 0-1 architecture, emit `SOURCE_CONFLICT` and stop that slice for review.

---

# 10. Build Order

## M-B0 — Canonicalization / Development OS

Status: established.

Includes:

- Ground Truth;
- Product Spec;
- Product Schema;
- Architecture;
- Workflows;
- Binance Source Truth;
- Review / Execution / Orchestration / Ground Truth skills;
- invariants;
- interfaces;
- authority map;
- M-B1 agent decomposition.

## M-B1 — Mandate Kernel

Goal: implement all financial-authority semantics without any Binance exchange write integration.

```text
TradeThesis
→ compileMandate()
→ ExecutionMandate
→ MandateStore
→ mandate state machine
→ evaluateMandate()
→ ExecutionIntent | ExecutionRefusal
```

Required proof ceiling:

```text
LOCAL_PASS
```

No Binance live claim in this milestone.

### M-B1 parallel agents

```text
A — domain types + compileMandate()
B — MandateStore + supersession / persistence
C — mandate runtime state machine
D — evaluateMandate() after A interface freeze
E — independent adversarial/property testing after integration
```

## M-B2 — Binance State Plane

Goal:

```text
current official Binance streams / account surfaces
        ↓
versioned local MarketStateStore
versioned local AccountStateStore
OrderStateStore
```

Start with:

```text
LIVE READ
NO WRITE
```

Required proof:

```text
live connection
freshness tracking
state versions
reconnect behavior
stale-state failure
```

## M-B3 — Execution Economics

Implement current-state economics:

```text
expectedMoveBps
- spreadCostBps
- slippageBps
- feeBps
- fundingCostBps
= executableEdgeBps
```

Add local order-book walking and bounded executable-size calculation.

Required proof:

```text
SHADOW execution assessments
```

## M-B4 — Binance Reasoning Workflow

Adapt the existing evidence/research/council system to produce Binance `TradeThesis` objects rather than Delphi probability beliefs.

Do not reuse Delphi LMSR probability mechanics.

Target:

```text
BTCUSDT / ETHUSDT candidate
→ evidence
→ ADVOCATE
→ OPPOSE
→ market analysis
→ council
→ LONG / SHORT / NO_TRADE thesis
→ mandate
```

Required proof:

```text
END-TO-END SHADOW PASS
```

## M-B5 — Single OrderWriter + Reconciliation

Implement the exact officially documented Binance write path selected for the product.

Required properties:

- one writer;
- bounded order only;
- deterministic client identity;
- durable `SUBMITTING` before outbound I/O;
- no blind retry after ambiguous submission;
- acknowledgement/fill reconciliation;
- kill switch.

Required proof:

```text
controlled canary execution only after review
```

## M-B6 — Full Workflow Runtime

Connect:

```text
research workflow
+
thesis refresh workflow
+
hot data runtime
+
mandate lifecycle
+
execution/reconciliation
```

Required proof:

```text
restart recovery
mandate persistence
reconciliation
no duplicate authority
```

## M-B7 — Shadow Evidence Run

Run sustained no-write operation.

Collect:

- candidates;
- research latency;
- thesis latency;
- mandate issuance;
- trigger latency;
- refusal reasons;
- would-execute economics;
- drift between thesis-time and execution-time state.

## M-B8 — Controlled Live Evidence + Submission Freeze

Enable minimal bounded authority.

Collect:

- exact commit;
- official source snapshot;
- live state receipts;
- mandate trace;
- execution/refusal trace;
- exchange acknowledgement/fill receipt;
- reconciliation result;
- demo recording;
- evaluator-ready evidence packet.

---

# 11. Hard Build Invariants

```text
REASONING NEVER SENDS ORDERS.

HOT PATH NEVER CALLS AN LLM.

ONLY ONE COMPONENT OWNS EXCHANGE WRITE AUTHORITY.

A MANDATE IS IMMUTABLE AFTER ISSUANCE.

A SUPERSEDED / EXPIRED / REVOKED / USED MANDATE CANNOT EXECUTE.

A MANDATE IS CONSUMED BEFORE OUTBOUND ORDER I/O.

EXECUTION USES CURRENT BINANCE STATE, NOT COUNCIL-TIME STATE.

EXECUTABLE EDGE MUST STILL EXIST AT SUBMISSION.

STALE MARKET OR ACCOUNT STATE FAILS CLOSED.

UNKNOWN SUBMISSION STATE NEVER CAUSES BLIND RETRY.

EVERY ORDER IS BOUND TO ONE MANDATE.

EVERY MANDATE IS BOUND TO ONE THESIS AND COUNCIL DECISION.
```

---

# 12. Code Separation Target

Do not delete Delphi.

Evolve incrementally toward:

```text
src/
├── domain/                  # venue-neutral only when truly neutral
├── forecast/                # shared evidence/council primitives where valid
├── runtime/                 # generalized workflow/runtime primitives
├── venues/
│   ├── delphi/
│   └── binance/
├── strategies/
│   ├── delphi/
│   └── directional/
└── ledger/
```

During M-B1/M-B2, temporary `src/binance/**` placement is acceptable if it avoids destabilizing Delphi. Refactor only after interfaces prove stable.

Do not move existing Delphi code merely to satisfy a prettier target tree.

---

# 13. What Must Not Happen

Do not:

- rename Delphi concepts and pretend they are Binance concepts;
- copy `MarketBelief.probability` into Binance directional logic;
- use `outcomeIndex` for Binance instruments;
- use LMSR quote semantics for Binance order books;
- let Agent OS convenience redefine 0-1 authority invariants;
- let 0-1 architecture invent unsupported Binance behavior;
- mix Spot and Futures docs;
- let worker agents place orders;
- claim live capability from mocks;
- claim alpha from one profitable trade.

---

# 14. Definition of Binance-Agent Complete

The Binance agent is not complete when code compiles.

It is complete for the hackathon when the evidence ledger proves:

```text
canonical architecture preserved
+
current official Binance integration verified
+
live market/account state works
+
parallel evidence workflow works
+
Council produces thesis/refusal
+
mandate compiles and expires correctly
+
hot-path current-state validation works
+
explicit refusal path is demonstrated
+
one bounded execution path works where authorized
+
ack/fill/reconciliation is recorded
+
restart/ambiguity behavior is safe
+
demo and GitHub reflect the same build
```

---

# 15. Governing Maxim

```text
Pull product meaning from 0-1.
Pull exchange behavior from Binance.
Pull implementation scope from the Change Record.
Pull current code from the assigned branch.
```

That is the rule every coding agent should follow.