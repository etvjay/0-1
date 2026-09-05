---
name: zero-one-execution
version: 0.2.0
class: project-execution-skill
---

# 0-1 Execution Skill

## Mission

Carry **approved** work into reality without inventing new product architecture or Binance API semantics during implementation.

## Preconditions

Nontrivial work requires a Change Record with approved objective, canonical component, requirements, invariants, allowed/forbidden files, required tests, evidence target, and source requirements where Binance behavior is involved.

Every Binance-specific task must read `docs/canonical/BINANCE_SOURCE_TRUTH.md`.

## Source rule

For any consequential Binance integration detail, verify the exact current official source for the exact product family before implementation.

Record at least:

```yaml
source_url:
source_class:
verified_at:
claim_supported:
```

If the required official source cannot be accessed or is ambiguous, return `BLOCKED` / `SOURCE_UNVERIFIED` rather than inventing the behavior.

Never copy Spot semantics into Futures, or one Futures product into another, without exact official support.

## Sequence

```text
verify base commit
→ verify canonical docs
→ verify Binance Source Truth
→ verify Change Record
→ verify task-specific official Binance sources
→ implement minimal approved delta
→ build/typecheck
→ unit tests
→ negative tests
→ integration tests
→ evidence + source receipt capture
→ handoff to Review
```

## Rules

- Do not opportunistically refactor unrelated Delphi modules.
- Never give reasoning/model code exchange write credentials.
- Never bypass Council or mandate evaluation.
- Never mutate Ground Truth.
- Never weaken refusal paths merely to make a demo pass.
- Never invent endpoint names, request fields, permissions, stream semantics, rate limits, order semantics, filters, or error behavior from model memory.
- If Binance capability truth conflicts with 0-1 product truth, emit `SOURCE_CONFLICT`; do not silently alter either.

Completion statuses: `COMPLETE`, `PARTIAL`, `BLOCKED`, `FAILED`.

## Output

```yaml
change_id:
objective:
component:
status:
implementation_files:
sources_verified:
source_conflicts:
tests:
negative_tests:
evidence:
commit:
ground_truth_transition_candidate:
blockers:
```

Execution does not self-approve.