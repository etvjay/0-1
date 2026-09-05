---
name: zero-one-review
version: 0.2.0
class: project-review-skill
---

# 0-1 Review Skill

## Mission

Decide whether a proposed or implemented 0-1 change is acceptable against canonical product truth. The reviewer is adversarial and does not implement fixes unless separately assigned.

## Mandatory inputs

Read Ground Truth, Binance Source Truth, Product Spec, Product Schema, Architecture, Workflows, Requirements, Invariants, Interfaces, Authority Map, current Change Record, implementation diff, tests, source evidence, and runtime evidence receipts.

## Review order

1. **Source compliance** — consequential Binance API behavior must cite current official `binance.com` / `developers.binance.com` documentation for the exact product family. Reject cross-family inference (Spot vs USD-M vs COIN-M etc.), model-memory endpoints, and uncited authentication/order/stream semantics.
2. **Canonical fit** — preserve `OPINION ≠ TRADE`; no accidental new product/strategy.
3. **Authority** — stop-ship if reasoning/model code can write orders, multiple writers appear, workers bypass Council/mandates, or expired/superseded authority executes.
4. **State/concurrency** — atomic supersession, stale-state rejection, version binding, race handling, crash/retry ambiguity, contradictory LONG/SHORT authority, partial fills.
5. **Execution economics** — expected move is not net edge; spread/slippage/fees/funding included; order boundaries cannot exceed mandate; current exposure enforced.
6. **Refusal semantics** — uncertain/refused paths cannot silently become default trades.
7. **Tests** — include expiry, supersession, consumption, stale state, drift, spread/slippage, edge collapse, exposure, wrong binding, duplicate/retry ambiguity, crash recovery.
8. **Evidence** — claims never exceed receipts.

## Source-conflict rule

If official Binance documentation conflicts with canonical 0-1 architecture, verdict is `BLOCKED` or `REVISE` with a `SOURCE_CONFLICT` record. The reviewer must not choose a side silently.

## Verdict

Exactly one: `APPROVE`, `APPROVE_WITH_REQUIRED_FOLLOWUPS`, `REVISE`, `REJECT`, `BLOCKED`.

## Output

```yaml
change_id:
verdict:
source_compliance:
source_conflicts:
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