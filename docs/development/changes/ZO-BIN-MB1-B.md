# ZO-BIN-MB1-B — Mandate Store + Supersession

```yaml
change_id: ZO-BIN-MB1-B
role: builder
branch: agent/mb1-store
base_commit: 936e63228b4e3308a0d1779957e304f0f011a507

objective:
  Implement durable mandate storage, atomic active-mandate selection, supersession and pre-submission consumption semantics against the frozen interfaces.

canonical_component:
  runtime / mandate store

read_first:
  - docs/canonical/GROUND_TRUTH.md
  - docs/canonical/PRODUCT_SPEC.md
  - docs/canonical/PRODUCT_SCHEMA.md
  - docs/canonical/ARCHITECTURE.md
  - docs/canonical/WORKFLOWS.md
  - docs/development/INVARIANTS.md
  - docs/development/INTERFACES.md
  - docs/development/STATE_MACHINES.md

requirements:
  - one active mandate per authority key
  - immutable mandate payloads
  - atomic issue/supersede semantics
  - superseded mandates can never be returned active
  - consumeForSubmission must persist consumption before external I/O
  - runtime state is distinct from mandate payload
  - persistence writes must be crash-safe at the storage layer available in the repo
  - no exchange API calls

allowed_files:
  - src/runtime/**mandate**
  - src/runtime/**store**
  - src/binance/runtime/**
  - test/**mandate-store**
  - tests/**mandate-store**
  - docs/development/changes/ZO-BIN-MB1-B.md

forbidden_files:
  - src/delphi/**
  - src/forecast/**
  - src/venues/**
  - docs/canonical/**

required_tests:
  - issue then getActive returns exact mandate
  - supersession atomically replaces active mandate
  - old mandate remains historical but non-active
  - consumed mandate cannot be consumed twice
  - restart/reload preserves active/runtime state
  - simulated crash between consume and hypothetical send cannot re-arm mandate

required_commands:
  - npm run check
  - npm test

evidence_required:
  - exact files changed
  - commit SHA
  - storage/recovery test receipts
  - unresolved persistence assumptions

handoff_to:
  - Agent D evaluator
  - Agent E adversarial tests

must_not:
  - invent exchange retry policy
  - submit/cancel orders
  - edit Ground Truth
```
