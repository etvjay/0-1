# ZO-BIN-MB1-A — Domain Types + Mandate Compiler

```yaml
change_id: ZO-BIN-MB1-A
role: builder
branch: agent/mb1-domain
base_commit: 936e63228b4e3308a0d1779957e304f0f011a507

objective:
  Implement the canonical Binance domain types and compileMandate() contract without touching exchange I/O.

canonical_component:
  domain / mandate compiler

read_first:
  - docs/canonical/GROUND_TRUTH.md
  - docs/canonical/PRODUCT_SPEC.md
  - docs/canonical/PRODUCT_SCHEMA.md
  - docs/canonical/ARCHITECTURE.md
  - docs/canonical/WORKFLOWS.md
  - docs/development/INVARIANTS.md
  - docs/development/INTERFACES.md
  - docs/development/AUTHORITY_MAP.md

requirements:
  - define TradeThesis target types
  - define ExecutionMandate target types
  - define ExecutionIntent / ExecutionRefusal supporting types needed by compiler consumers
  - compileMandate must be deterministic for identical input
  - compiler may not perform network or model I/O
  - mandate must be immutable by construction/API discipline
  - mandate must not broaden thesis venue, symbol, side/direction or operator policy
  - mandate must carry provenance and explicit expiry
  - MVP maxUses must equal 1

allowed_files:
  - src/domain/**
  - src/binance/domain/**
  - test/**mandate**
  - tests/**mandate**
  - docs/development/changes/ZO-BIN-MB1-A.md

forbidden_files:
  - src/delphi/**
  - src/forecast/**
  - src/runtime/**
  - src/venues/**
  - docs/canonical/**

required_tests:
  - identical inputs compile identical semantic mandate output
  - thesis side/symbol/venue cannot be widened
  - policy limits cannot be widened
  - expiry is explicit and bounded
  - maxUses is exactly 1
  - invalid thesis/policy bindings fail closed

required_commands:
  - npm run check
  - npm test

evidence_required:
  - exact files changed
  - exact commit SHA
  - test receipts
  - unresolved type/interface risks

handoff_to:
  - Agent C state machine
  - Agent B store
  - Agent D evaluator

must_not:
  - add Binance exchange calls
  - add signing credentials
  - change canonical docs
  - refactor unrelated Delphi code
```
