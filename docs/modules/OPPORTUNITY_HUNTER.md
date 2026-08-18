# Opportunity Hunter

## Purpose

`npm run hunt` converts the open Delphi market set into a ranked shadow-mode opportunity report. It does not sign transactions.

## Pipeline

```text
open Delphi markets
-> metadata-only triage
-> top-N research budget
-> autonomous evidence research
-> Evidence Council
-> refresh Delphi market prior
-> reject material prior drift
-> derive binary complement side when valid
-> exact quote ladder
-> deterministic trade policy
-> rank surviving proposals
-> persistent hunt report
```

## Why two stages

Research is expensive. Triage is deliberately cheap and uses only market metadata, probabilities, resolution proximity, resolvability, source specificity, event-archetype support and outcome count. Only the highest-ranked candidates consume retrieval/model calls.

Triage score is information priority, not a trading recommendation.

## Final opportunity score

A candidate becomes `ACTIONABLE` only when at least one exact Delphi quote survives the existing confidence, freshness, execution-edge, price-impact and exposure gates.

The current ranking score is:

```text
best quoted expected value
* council confidence
* disagreement penalty
```

This is intentionally based on quoted average execution price rather than displayed spot edge.

## Prior-drift guard

Research takes time. After the council returns a forecast, the hunter fetches the Delphi market again. If the researched outcome's implied probability has moved more than `ZERO_ONE_HUNT_MAX_PRIOR_DRIFT`, the result becomes `PRIOR_DRIFT` and is not quote-ranked. The next cycle must research from a fresh prior.

## Binary side handling

For exactly two outcomes, a forecast for one side induces the complement probability for the other side. Both sides are quote-tested. Multi-outcome markets do not receive synthetic complements.

## Output

Reports are written under:

```text
data/hunt/reports/<timestamp>.json
```

Per-candidate research evidence is written under:

```text
data/hunt/research/<market>-<outcome>-<timestamp>.json
```

Runtime status values:

- `ACTIONABLE`
- `NO_EXECUTABLE_EDGE`
- `RESEARCH_REFUSED`
- `PRIOR_DRIFT`
- `RESEARCH_FAILED`

None of these statuses authorizes signing.

## Configuration

```text
ZERO_ONE_HUNT_MARKET_LIMIT=100
ZERO_ONE_HUNT_RESEARCH_BUDGET=8
ZERO_ONE_HUNT_ACCOUNT_VALUE=100
ZERO_ONE_HUNT_MARKET_EXPOSURE=0
ZERO_ONE_HUNT_MAX_PRIOR_DRIFT=0.08
```

CLI positional overrides:

```bash
npm run hunt -- [market-limit] [research-budget] [account-value] [market-exposure]
```

## Consumer boundary

The hunter consumes `SearchProvider` and `OpinionProvider` through the autonomous research adapter. A provider can be replaced without changing triage, Evidence Council, quote evaluation, or opportunity ranking.

## Evidence boundary

`ACTIONABLE` means a shadow proposal survived the current model and deterministic policy. It does not prove forecasting alpha, future profit, transaction success, or leaderboard improvement. Those claims require resolved forecast scoring and later live execution evidence.
