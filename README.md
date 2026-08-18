# 0-1

**Evidence-bounded autonomous trading for the Delphi Agent Competition.**

`0-1` is a competition-native research and execution system for Delphi's general prediction markets. It separates world observations, resolution semantics, evidence, probability beliefs, executable quotes, capital policy, and eventual outcomes so that a model opinion cannot silently become a trade.

## Governing objective

Maximize competition P&L without confusing a forecast with executable edge.

On the Delphi competition, a winning share redeems 1:1 and the LMSR spot price is the market-implied probability. Therefore:

```text
spot edge      = our probability - market probability
execution edge = our probability - average quoted execution price
expected value = shares * execution edge
```

The second quantity is the one that matters before a buy because shallow LMSR liquidity can move price materially.

## Current pipeline

```text
all open Delphi markets
        ↓
cheap metadata/proximity triage
        ↓
ResolutionSpec + market routing
        ↓
autonomous evidence research
        ↓
ADVOCATE + OPPOSE opinions
        ↓
Evidence Council
        ↓
MarketBelief
        ↓
refresh market prior / reject drift
        ↓
exact quoteBuy(shares)
        ↓
execution-edge + risk gates
        ↓
ranked shadow opportunity | refusal
        ↓
forecast/evidence ledger
        ↓
settlement
        ↓
Brier / log-loss / market-relative skill
```

No autonomous transaction signing is enabled yet.

## Quick start

Requirements: Node.js 22+.

```bash
npm install
cp .env.example .env
npm run check
npm run scan
```

Environment:

```text
DELPHI_NETWORK=competition-testnet
DELPHI_API_ACCESS_KEY=<testnet Delphi API key>
DELPHI_COMPETITION_ID=<optional competition UUID>
TAVILY_API_KEY=<research retrieval key>
OPENAI_API_KEY=<opinion provider key>
```

## Commands

```bash
npm run build
npm test
npm run check

# live competition inspection
npm run scan
npm run route:market -- <market>
npm run evaluate -- <market> <outcome-index> <our-prob> <confidence> [account-value] [exposure]

# autonomous general-market research
npm run research:market -- <market> [outcome-index]

# M2c shadow opportunity hunter
npm run hunt -- [market-limit] [research-budget] [account-value] [market-exposure]

# M1 evidence archive and replay
npm run history:archive
npm run record:snapshot -- <market>
npm run replay -- data/history/latest.json <market> <cutoff-iso-or-ms>
npm run score:forecasts

# optional specialist: terminal crypto threshold baseline
npm run forecast:crypto -- <market> [account-value] [market-exposure]
```

`hunt` scans open Delphi markets, ranks them cheaply, spends the configured research budget only on the highest-priority distinct markets, refreshes Delphi probabilities after research, rejects material prior drift, quote-tests valid forecast sides and writes a ranked shadow report under `data/hunt/reports/`.

Every council-approved forecast is also appended to the common forecast ledger with the contemporaneous Delphi probability so resolved markets can later establish whether 0-1 actually beat the market baseline.

## Replay truth boundary

Historical on-chain events establish trades and resolutions. They do **not** by themselves reconstruct every past marginal LMSR probability. `0-1` therefore imports historical trade/settlement events and records live probability snapshots and forecasts prospectively.

`ReplayClock.at(market, cutoff)` exposes only events whose timestamps are at or before the requested cutoff. Settlement data is not visible before settlement, and forecasts created at or after settlement are excluded from scoring as hindsight.

## Implemented

### M0 — competition kernel

- competition-testnet configuration;
- live market discovery;
- canonical `MarketBelief` and `TradeProposal` schemas;
- spot-edge and quoted execution-edge calculation;
- deterministic freshness, confidence, edge, impact and exposure gates;
- exact Delphi quote ladder;
- explicit refusals instead of forced trades.

### M1 — archive and replay foundation

- normalized buy/sell and settlement/failure history;
- subgraph checkpoint/error state;
- market catalog archive;
- immutable evidence hashing;
- append-only market observations and forecasts;
- cutoff-safe replay clock;
- Brier/log-loss scoring against contemporaneous market probability;
- tests against future-data leakage.

### M2 — general prediction-market forecasting

- `ResolutionSpec` and market-domain/archetype routing;
- autonomous PRIMARY/CORROBORATE/OPPOSE/BASE_RATE research planning;
- replaceable `SearchProvider` and `OpinionProvider` boundaries;
- evidence normalization and source-independence grouping;
- separate ADVOCATE and OPPOSE opinions;
- deterministic Evidence Council with freshness, binding, evidence, ambiguity and disagreement refusal;
- research-packet persistence;
- forecast-ledger admission only after council acceptance.

### M2c — autonomous opportunity hunter

- metadata-only triage across open markets;
- resolution-proximity and uncertainty prioritization;
- one research target per market per cycle;
- bounded research budget;
- post-research market-prior refresh and drift refusal;
- binary complement-side evaluation only when mathematically valid;
- exact quote-ladder evaluation through the existing deterministic trade policy;
- ranked shadow opportunities;
- persistent hunt reports and research packets;
- no signing authority.

### Optional specialist — crypto terminal threshold baseline

A narrow GBM/realized-volatility forecaster remains available for supported terminal crypto threshold markets. It is a specialist plugin, not the architecture of 0-1 and not a claim of profitable alpha.

## Not yet claimed

- profitable forecasting alpha;
- a green live `hunt` run with production credentials from this environment;
- autonomous signing/execution;
- competitor-signal lift;
- Engram execution-memory lift;
- Cinch-derived portfolio/drawdown controller;
- calibrated specialist weighting across domains.

These are promoted only after their experiment gates are green.

## Source truth

Competition semantics are implemented against official Gensyn Delphi reference material. Competition markets use LMSR rather than Delphi's regular DPM mechanism, winning shares redeem 1:1, and quote paths must be consulted before execution because shallow liquidity can materially change average execution price.

See `docs/BUILD_ORDER.md`, `docs/ASSET_IMPORT_MAP.md`, and `docs/modules/`.

## License

MIT
