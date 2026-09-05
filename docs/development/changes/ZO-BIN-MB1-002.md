# ZO-BIN-MB1-002 — Mandate Store

```yaml
change_id: ZO-BIN-MB1-002
owner_role: builder
objective: Implement durable mandate issuance, active-lane lookup, atomic supersession and consume-for-submission semantics.
canonical_component: runtime authority store
status: APPROVED_FOR_IMPLEMENTATION
allowed_files:
  - src/runtime/mandate-store.ts
  - src/runtime/mandate-persistence.ts
  - test/mandate-store.test.ts
forbidden_files:
  - src/venues/**
  - src/forecast/**
  - docs/canonical/**
requirements:
  - one active mandate per authority lane
  - supersession is atomic
  - consumed mandate cannot return to ARMED
  - consumeForSubmission persists clientOrderId before external I/O
  - restart restores status accurately
negative_tests_required:
  - duplicate issue
  - superseded execution attempt
  - double consume
  - crash/reload after consume
  - stale active pointer
```
