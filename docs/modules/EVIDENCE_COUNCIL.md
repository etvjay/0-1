# Evidence Council module

Path: `src/forecast/evidence/`

Purpose: turn already-structured, time-bounded evidence-backed forecast opinions into a deterministic `FORECAST | REFUSED` result. This module does **not** retrieve the web, interpret arbitrary text, or own a model provider. Retrieval/research/domain adapters sit upstream.

## Input contract

Use `EvidenceForecastBundle` from `src/forecast/evidence/types.ts`.

A bundle contains:
- the canonical `MarketRoutingDecision` / `ResolutionSpec`;
- the contemporaneous Delphi market probability for the target outcome;
- normalized `EvidenceItem[]`;
- independent `ForecastOpinion[]` objects bound to evidence IDs.

Every evidence item should declare:
- source and source type;
- observation and optional expiry time;
- stance: `SUPPORTS | CONTRADICTS | CONTEXT`;
- reliability in `[0,1]`;
- an `independenceGroup` so syndicated/duplicated sources are not counted as independent;
- a concise summary and raw/normalized value.

Every opinion should declare:
- exact `marketId` and `outcomeIndex`;
- probability and confidence;
- role: `BASE | ADVOCATE | OPPOSE | SPECIALIST`;
- method/version;
- generation and expiry timestamps;
- evidence IDs used;
- assumptions and rationale.

## Deterministic evaluation

```ts
import {
  defaultEvidenceCouncilPolicy,
  evaluateEvidenceCouncil,
} from "../../src/forecast/evidence/council.js";

const result = evaluateEvidenceCouncil(bundle, defaultEvidenceCouncilPolicy);
```

The council validates:
1. bundle schema and probability ranges;
2. resolution ambiguity budget;
3. exact market/outcome binding;
4. opinion freshness and confidence;
5. evidence existence/freshness;
6. evidence independence groups;
7. disagreement across surviving opinions.

Only then does it aggregate probability. Delphi's current probability is included explicitly as a prior, rather than being silently ignored.

## Refusal semantics

Possible refusal codes:
- `INVALID_BUNDLE`
- `NO_VALID_OPINIONS`
- `STALE_OPINIONS`
- `MISSING_EVIDENCE`
- `EXCESSIVE_DISAGREEMENT`
- `AMBIGUOUS_RESOLUTION`

A refusal is a valid outcome. Upstream adapters should fix the evidence/research problem rather than override the council.

## CLI

```bash
npm run forecast:evidence -- path/to/evidence-bundle.json
```

If the council produces a forecast, the CLI appends the resulting probability/confidence and contemporaneous market prior into the standard `data/forecasts.jsonl` ledger for later Brier/log-loss scoring.

## Intended adapters

Planned upstream producers include:
- generic research/evidence adapter;
- sports state adapter;
- politics/polling adapter;
- macro-release adapter;
- scheduled-event/primary-source watcher;
- culture/product-event adapter;
- crypto quantitative specialists.

They may disagree. They must not bypass the common evidence/provenance boundary.

## Source lineage

Semantics adapted from the user's existing research systems:
- Opportunity Foundry: evidence-first lifecycle, freshness, contradiction and temporal holdout;
- Noema: evidence-bounded objects, provenance and AI-not-truth separation;
- Thinking Reed / RJP: opposition and bounded judgment;
- Research Foundry: explicit counter-case/OPPOSE discipline.

No repository has been wholesale copied; the Delphi module is a narrow adaptation with its own schemas and tests.
