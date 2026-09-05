# ZO-BIN-MB1-C — Mandate Runtime State Machine

```yaml
change_id: ZO-BIN-MB1-C
role: builder
branch: agent/mb1-state-machine
base_commit: 936e63228b4e3308a0d1779957e304f0f011a507

objective:
  Implement the canonical mandate runtime transition system independently of Binance transport.

canonical_component:
  runtime / mandate state machine

requirements:
  - implement ARMED, TRIGGERED, VALIDATING, SUBMITTING, ACKNOWLEDGED, PARTIALLY_FILLED, FILLED
  - implement REFUSED, INVALIDATED, EXPIRED, SUPERSEDED, CANCELLED, FAILED and UNKNOWN where required
  - illegal transitions fail closed
  - terminal states cannot silently reactivate
  - transition records include mandate id and timestamps
  - state machine has no exchange/model/network dependency

allowed_files:
  - src/runtime/**state**
  - src/runtime/**mandate**
  - src/binance/runtime/**
  - test/**state-machine**
  - tests/**state-machine**
  - docs/development/changes/ZO-BIN-MB1-C.md

forbidden_files:
  - src/delphi/**
  - src/forecast/**
  - src/venues/**
  - docs/canonical/**

required_tests:
  - every canonical legal transition
  - illegal transition rejection
  - terminal-state non-reactivation
  - superseded mandate cannot return ARMED
  - expired mandate cannot trigger
  - refusal/failure transition preserves reason metadata

required_commands:
  - npm run check
  - npm test

evidence_required:
  - transition matrix
  - exact files changed
  - commit SHA
  - test receipts

handoff_to:
  - Agent B store
  - Agent D evaluator
  - Agent E adversarial tests
```
