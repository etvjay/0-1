---
name: zero-one-execution
version: 0.1.0
class: project-execution-skill
---

# 0-1 Execution Skill

## Mission

Carry **approved** work into reality without inventing new product architecture during implementation.

## Preconditions

Nontrivial work requires a Change Record with approved objective, canonical component, requirements, invariants, allowed/forbidden files, required tests, and evidence target.

## Sequence

```text
verify base commit
→ verify canonical docs
→ verify Change Record
→ implement minimal approved delta
→ build/typecheck
→ unit tests
→ negative tests
→ integration tests
→ evidence capture
→ handoff to Review
```

## Rules

- Do not opportunistically refactor unrelated Delphi modules.
- Never give reasoning/model code exchange write credentials.
- Never bypass Council or mandate evaluation.
- Never mutate Ground Truth.
- Never weaken refusal paths merely to make a demo pass.

Completion statuses: `COMPLETE`, `PARTIAL`, `BLOCKED`, `FAILED`.

## Output

```yaml
change_id:
objective:
component:
status:
implementation_files:
tests:
negative_tests:
evidence:
commit:
ground_truth_transition_candidate:
blockers:
```

Execution does not self-approve.
