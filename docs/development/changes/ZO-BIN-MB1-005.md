# ZO-BIN-MB1-005 — Independent Adversarial Test Harness

```yaml
change_id: ZO-BIN-MB1-005
owner_role: tester
objective: Independently pressure-test M-B1 without trusting builder explanations.
canonical_component: verification
status: BLOCKED_ON_MB1_001_TO_004
allowed_files:
  - test/mandate-invariants.test.ts
  - test/mandate-properties.test.ts
  - test/mandate-crash-replay.test.ts
forbidden_files:
  - src/**
  - docs/canonical/**
requirements:
  - test all hard invariants
  - add negative mutations for each hard requirement
  - test supersession races
  - test deterministic replay for identical state versions
  - test consume-before-I/O semantics with injected crash
  - verify no execution path is reachable from refused/terminal mandate
outputs:
  - failing cases first
  - final pass/fail matrix
  - exact commands and receipts
  - no implementation fixes unless separately assigned
```
