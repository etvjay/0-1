# 0-1 Binance Architecture

## Architecture thesis

0-1 separates **slow intelligence** from **fast financial execution**. The bridge is an immutable, short-lived `ExecutionMandate`.

```text
REASONING PLANE
candidate
→ parallel evidence / oppose / market workers
→ Evidence Council
→ TradeThesis
→ compileMandate()

HOT DATA PLANE
Binance market + account/order streams
→ versioned local state
→ event trigger
→ evaluateMandate()

EXECUTION PLANE
single OrderWriter
→ durable SUBMITTING state
→ exchange write
→ ACK/fill stream
→ reconciliation + ledger
```

Concurrency rule:

```text
many analysts → one deterministic council → one active mandate → one execution writer
```

The Council is a semantic gate, not simple voting. `compileMandate()` cannot broaden thesis direction/venue/symbol or loosen operator limits. Hot-path reads come from versioned local state and record mandate/market/account versions.

Execution economics:

```text
executableEdgeBps = expectedMoveBps - spreadCostBps - slippageBps - feeBps - fundingCostBps
```

Prefer bounded limit/marketable-limit semantics; never turn bounded authority into an unconstrained market order.

Crash/ambiguity ordering:

```text
construct intent
→ persist SUBMITTING + consume mandate + clientOrderId
→ durable commit
→ outbound write
→ ACK/fill
→ reconcile
```

`UNKNOWN` state must be reconciled before retry. Existing Delphi support remains; refactor incrementally rather than destabilizing it.
