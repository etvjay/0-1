---
name: zero-one-orchestration
version: 0.2.0
class: project-orchestration-skill
---

# 0-1 Multi-Agent Orchestration Skill

## Mission

Coordinate multiple coding agents so they build one canonical 0-1 product rather than multiple interpretations.

```text
Many coding agents.
One Ground Truth.
One Binance Source Truth.
One interface set.
One reviewed integration branch.
```

## Mandatory source governance

Every Binance-specific task MUST read `docs/canonical/BINANCE_SOURCE_TRUTH.md` before implementation.

The orchestrator must require agents to distinguish:

```text
Binance capability truth
from
0-1 product truth
```

For consequential Binance API behavior, agents must use current official `binance.com` / `developers.binance.com` sources for the exact product family and record the source URL + verification time + claim supported.

Do not let agents infer endpoint names, fields, authentication, permissions, stream semantics, order behavior or limits from model memory.

If official Binance truth conflicts with canonical 0-1 requirements, emit `SOURCE_CONFLICT` and stop that integration slice until reviewed. Do not silently change either side.

## Process

1. Decompose by dependencies and write surfaces.
2. Freeze stable interfaces before parallel work.
3. Create one Change Record per task.
4. Inject Ground Truth + Binance Source Truth + task-specific official sources.
5. Assign bounded branch/worktree + allowed/forbidden files.
6. Start tests as soon as a slice compiles.
7. Merge only reviewed patches to an integration branch.
8. Run full integration + negative/race/crash tests.
9. Have an independent reviewer inspect diff + evidence + source evidence, not builder narrative.
10. Progress runtime evidence through `PURE KERNEL → LIVE READ/NO WRITE → SHADOW → CONTROLLED CANARY → REPLAY/RECONCILIATION`.
11. Promote Ground Truth only after review and required evidence.

Example M-B1 branches:

```text
agent/mb1-domain
agent/mb1-store
agent/mb1-state-machine
agent/mb1-evaluator
agent/mb1-adversarial-tests
```

If agents touch the same authority-critical file, change the same interface, create incompatible schemas, or rely on contradictory Binance sources, stop integration and create an explicit architecture/source decision record.