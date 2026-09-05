---
name: zero-one-orchestration
version: 0.1.0
class: project-orchestration-skill
---

# 0-1 Multi-Agent Orchestration Skill

## Mission

Coordinate multiple coding agents so they build one canonical 0-1 product rather than multiple interpretations.

```text
Many coding agents.
One Ground Truth.
One interface set.
One reviewed integration branch.
```

## Process

1. Decompose by dependencies and write surfaces.
2. Freeze stable interfaces before parallel work.
3. Create one Change Record per task.
4. Assign bounded branch/worktree + allowed/forbidden files.
5. Start tests as soon as a slice compiles.
6. Merge only reviewed patches to an integration branch.
7. Run full integration + negative/race/crash tests.
8. Have an independent reviewer inspect diff + evidence, not builder narrative.
9. Progress runtime evidence through `PURE KERNEL → LIVE READ/NO WRITE → SHADOW → CONTROLLED CANARY → REPLAY/RECONCILIATION`.
10. Promote Ground Truth only after review and required evidence.

Example M-B1 branches:

```text
agent/mb1-domain
agent/mb1-store
agent/mb1-state-machine
agent/mb1-evaluator
agent/mb1-adversarial-tests
```

If agents touch the same authority-critical file, change the same interface, or create incompatible schemas, stop integration and create an explicit architecture decision/change record.
