# ZO-BIN-MB1-D — Deterministic Mandate Evaluator

```yaml
change_id: ZO-BIN-MB1-D
role: builder
branch: agent/mb1-evaluator
base_commit: 936e63228b4e3308a0d1779957e304f0f011a507

depends_on:
  - ZO-BIN-MB1-A domain/compiler interface freeze
  - ZO-BIN-MB1-C state vocabulary

objective:
  Implement evaluateMandate() as a pure deterministic hot-path decision kernel returning ExecutionIntent or typed ExecutionRefusal.

canonical_component:
  hot path / execution economics

requirements:
  - no network I/O
  - no model/LLM I/O
  - identical input must produce identical semantic output
  - validate mandate active/latest/unused semantics supplied by caller/runtime
  - reject expired thesis/mandate
  - reject stale market/account state
  - reject invalid trigger/anchor drift
  - reject spread/slippage/fee/funding/volatility violations
  - compute executable edge from current state
  - reject edge below mandate floor
  - reject position/portfolio/leverage/loss violations where represented
  - build bounded limit/marketable-limit intent only within mandate authority
  - return first-class typed refusal with state versions and reason

allowed_files:
  - src/domain/**execution**
  - src/runtime/**evaluate**
  - src/binance/execution/**
  - src/binance/runtime/**evaluate**
  - test/**evaluate-mandate**
  - tests/**evaluate-mandate**
  - docs/development/changes/ZO-BIN-MB1-D.md

forbidden_files:
  - src/delphi/**
  - src/forecast/**
  - src/venues/**orders**
  - docs/canonical/**

required_tests:
  - happy-path intent
  - mandate expired
  - thesis expired
  - stale market state
  - stale account state
  - anchor drift
  - spread violation
  - slippage violation
  - fee/funding violation
  - executable edge collapse
  - position exposure violation
  - portfolio exposure violation
  - wrong symbol/account/side binding
  - generated limit price never exceeds mandate boundary

required_commands:
  - npm run check
  - npm test

evidence_required:
  - exact files changed
  - commit SHA
  - full refusal test matrix
  - deterministic-repeatability receipt

handoff_to:
  - Agent E adversarial tests
  - independent Reviewer

must_not:
  - send/cancel an exchange order
  - call Binance during evaluation
  - weaken mandate constraints to obtain an intent
```
