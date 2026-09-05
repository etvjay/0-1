# ZO-BIN-MB1-003 — Mandate State Machine

```yaml
change_id: ZO-BIN-MB1-003
owner_role: builder
objective: Implement explicit mandate lifecycle transitions and reject illegal transitions.
canonical_component: mandate runtime state machine
status: APPROVED_FOR_IMPLEMENTATION
allowed_files:
  - src/runtime/mandate-state-machine.ts
  - test/mandate-state-machine.test.ts
forbidden_files:
  - src/venues/**
  - src/forecast/**
  - docs/canonical/**
requirements:
  - implement ARMED/TRIGGERED/VALIDATING/SUBMITTING/ACKNOWLEDGED/PARTIALLY_FILLED/FILLED
  - implement REFUSED/INVALIDATED/EXPIRED/SUPERSEDED/CANCELLED/FAILED
  - terminal states cannot reactivate
  - transition reasons and timestamps are recorded
negative_tests_required:
  - FILLED to ARMED rejected
  - SUPERSEDED to TRIGGERED rejected
  - EXPIRED to SUBMITTING rejected
  - ACKNOWLEDGED without SUBMITTING rejected
```
