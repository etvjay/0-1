# ZO-BIN-MB1-004 — Hot-Path Evaluator

```yaml
change_id: ZO-BIN-MB1-004
owner_role: builder
objective: Implement deterministic evaluateMandate() returning ExecutionIntent or typed refusal.
canonical_component: hot-path execution authorization
status: BLOCKED_ON_MB1_001_INTERFACES
allowed_files:
  - src/domain/execution.ts
  - src/runtime/evaluate-mandate.ts
  - test/evaluate-mandate.test.ts
forbidden_files:
  - src/venues/binance/orders.ts
  - src/forecast/**
  - docs/canonical/**
requirements:
  - no network I/O
  - no LLM/model call
  - deterministic for identical input
  - freshness checks precede costly calculations
  - local book walk / slippage input supported
  - executable edge includes spread/slippage/fee/funding
  - current account exposure enforced
  - bounded limit price generated
negative_tests_required:
  - expired/superseded/used mandate
  - stale market/account state
  - entry invalid
  - anchor drift
  - spread/slippage/fee/funding limit
  - edge collapse
  - position/portfolio/leverage/loss limit
  - insufficient balance
  - wrong account/symbol/side
```
