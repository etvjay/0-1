# 0-1 Binance Workflows

## OpportunityWorkflow

```text
DISCOVERED → RESEARCHING → COUNCIL_REVIEW
→ THESIS_ACCEPTED | THESIS_REFUSED
→ MANDATE_ISSUED → MANDATE_ARMED → EXECUTING
→ FILLED | REFUSED | INVALIDATED | EXPIRED | FAILED
```

## Opportunity Formation

```text
watcher / cheap triage
→ parallel advocate + oppose + market analysis
→ Evidence Council
→ REFUSE | TradeThesis
→ compileMandate()
```

## Mandate Lifecycle

```text
MANDATE_ISSUED → ARMED → TRIGGERED → VALIDATING
→ REFUSED | SUBMITTING → ACKNOWLEDGED → PARTIAL | FILLED
```

Alternative transitions: `ARMED → EXPIRED/SUPERSEDED/INVALIDATED`, `TRIGGERED → INVALIDATED`, `SUBMITTING → FAILED/UNKNOWN`, `ACKNOWLEDGED/PARTIAL → CANCELLED`.

## Thesis Maintenance

```text
ACTIVE THESIS → refresh → RENEW | SUPERSEDE | REVOKE | EXPIRE
```

Refresh creates a new immutable mandate version; old mandates are never edited.

## Hot Data Runtime

```text
market WS + account/order events
→ versioned local state
→ active mandate lookup
→ trigger?
→ evaluateMandate()
→ intent/refusal
```

## Execution/Reconciliation

```text
ExecutionIntent
→ persist SUBMITTING
→ consume mandate
→ send bounded order
→ ACK/fill or UNKNOWN
→ reconcile
→ receipt
```

## Development Workflow

```text
CHANGE RECORD → BUILDER → LOCAL TESTS → TEST AGENT → NEGATIVE MUTATIONS
→ INTEGRATION → REVIEWER → APPROVE/REVISE/REJECT/BLOCKED
→ EXECUTOR → RUNTIME EVIDENCE → GROUND TRUTH PROMOTION
```
