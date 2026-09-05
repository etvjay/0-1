---
name: zero-one-review
version: 0.1.0
class: project-review-skill
---

# 0-1 Review Skill

## Mission

Decide whether a proposed or implemented 0-1 change is acceptable against canonical product truth. The reviewer is adversarial and does not implement fixes unless separately assigned.

## Mandatory inputs

Read Ground Truth, Product Spec, Product Schema, Architecture, Workflows, Requirements, Invariants, Interfaces, Authority Map, current Change Record, implementation diff, tests, and evidence receipts.

## Review order

1. **Canonical fit** — preserve `OPINION ≠ TRADE`; no accidental new product/strategy.
2. **Authority** — stop-ship if reasoning/model code can write orders, multiple writers appear, workers bypass Council/mandates, or expired/superseded authority executes.
3. **State/concurrency** — atomic supersession, stale-state rejection, version binding, race handling, crash/retry ambiguity, contradictory LONG/SHORT authority, partial fills.
4. **Execution economics** — expected move is not net edge; spread/slippage/fees/funding included; order boundaries cannot exceed mandate; current exposure enforced.
5. **Refusal semantics** — uncertain/refused paths cannot silently become default trades.
6. **Tests** — include expiry, supersession, consumption, stale state, drift, spread/slippage, edge collapse, exposure, wrong binding, duplicate/retry ambiguity, crash recovery.
7. **Evidence** — claims never exceed receipts.

## Verdict

Exactly one: `APPROVE`, `APPROVE_WITH_REQUIRED_FOLLOWUPS`, `REVISE`, `REJECT`, `BLOCKED`.

## Output

```yaml
change_id:
verdict:
canonical_fit:
authority_findings:
state_machine_findings:
execution_economics_findings:
security_findings:
test_findings:
evidence_findings:
required_changes:
ground_truth_transition:
blockers:
```
