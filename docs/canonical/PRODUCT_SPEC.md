# 0-1 Binance Product Specification

## Product statement

**0-1 is an evidence-bounded trading-agent execution system for Binance Agent OS.** It transforms slower evidence-backed reasoning into short-lived execution authority. A low-latency deterministic runtime may exercise that authority only while fresh market/account state still satisfies the exact economic and risk conditions that justified it.

## Core primitive — Execution Mandate

An `ExecutionMandate` is an immutable, short-lived, bounded authorization compiled from an accepted thesis. It binds exact venue/account, symbol/instrument, side, lifetime, economic floor, entry bounds, spread/slippage/fee/funding ceilings, exposure limits, invalidation conditions, execution method, and provenance. The mandate is **not** an order.

## Decisive workflow

```text
Opportunity detected
→ bounded parallel analysis
→ Evidence Council
→ TradeThesis
→ compile ExecutionMandate
→ arm mandate
→ Binance state trigger
→ deterministic revalidation
→ EXECUTE or REFUSE
→ receipt/reconciliation
→ ledger/outcome
```

The decisive demo must show both an accepted/executed path and an explicit refusal/invalidation path.

## MVP scope

Must be real: Agent OS-connected live state, structured research/council output, deterministic mandate compilation, deterministic hot-path validation, explicit refusal, bounded execution/proposal, inspectable provenance.

Excluded from MVP: HFT claims, MarketMaker/Cinch/Engram integration, generic multi-exchange routing, strategy marketplace, self-modifying policy, multiple worker writers, profitable-alpha claims without evidence.

Initial strategy surface:

```text
symbols: BTCUSDT, ETHUSDT
instrument: one explicitly selected Binance path
decision: LONG | SHORT | NO_TRADE
```

## Behaviors

- Cheap triage precedes expensive research.
- Thesis includes symbol, direction, horizon, confidence, expected move/range, provenance, invalidation and expiry.
- Thesis cannot authorize exchange writes.
- `compileMandate()` produces authority narrower than the thesis/operator policy.
- `evaluateMandate()` performs no network/model I/O, fails closed on stale state, and returns `ExecutionIntent | ExecutionRefusal`.
- Only `OrderWriter` may write to the exchange.

## Executable-edge semantics

```text
executableEdgeBps =
  expectedMoveBps
  - spreadCostBps
  - slippageBps
  - feeBps
  - expectedFundingCostBps
```

If executable edge falls below the mandate floor, refuse.

## Refusal is first-class

Examples: `MANDATE_EXPIRED`, `MANDATE_SUPERSEDED`, `MARKET_STATE_STALE`, `ACCOUNT_STATE_STALE`, `ANCHOR_DRIFT`, `SPREAD_LIMIT`, `SLIPPAGE_LIMIT`, `FUNDING_LIMIT`, `VOLATILITY_LIMIT`, `EDGE_COLLAPSED`, `POSITION_LIMIT`, `PORTFOLIO_LIMIT`, `INSUFFICIENT_BALANCE`, `ORDER_BOUNDARY_INVALID`.

## Trust model

Trust is distributed across evidence provenance, opposing analysis, deterministic Council, immutable mandate, fresh versioned state, deterministic economics/risk, one writer, and durable reconciliation.
