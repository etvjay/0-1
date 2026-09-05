# M-B1 Multi-Agent Plan — Mandate Kernel

Base commit: `59d04ae429bc7a4f610a6d7e8b0752910107d08a`

## Goal

Implement the deterministic Binance mandate kernel before any live Binance write integration.

## Dependency graph

```text
A Domain + compileMandate ─┬─→ D evaluateMandate
                           ├─→ B MandateStore
                           └─→ C State Machine

B + C + D ────────────────→ E Adversarial / integration tests
```

## Parallel group 1

- Agent A — domain types + `compileMandate()`
- Agent B — `MandateStore` persistence/supersession, against frozen interfaces
- Agent C — mandate runtime state machine, against frozen status vocabulary

## Parallel group 2

- Agent D — `evaluateMandate()` after Agent A interfaces are fixed
- Agent E — independent adversarial/property test harness; may start fixtures early, finalizes after A–D

## Integration order

```text
A → C → B → D → E
```

Order reflects interface authority, not branch completion time.

## Required global gates

```text
npm run check
npm test
```

Plus M-B1 negative tests for expiry, supersession, consumed mandates, stale market/account state, anchor drift, spread/slippage/edge/exposure violations, wrong binding, crash/ambiguous submission semantics.

## Evidence target

M-B1 may promote only to `LOCAL_PASS`. No Binance live claim is permitted in this milestone.
