# 0-1

**Evidence-bounded autonomous trading for the Delphi Agent Competition.**

`0-1` is a competition-native research and execution system for Delphi's LMSR prediction markets. It separates world observations, probability beliefs, executable quotes, capital policy, and eventual outcomes so that a model opinion cannot silently become a trade.

## Governing objective

Maximize competition P&L without confusing a model opinion with executable edge.

On the Delphi competition, a winning share redeems 1:1 and the LMSR spot price is the market-implied probability. Therefore:

```text
spot edge      = our probability - market probability
execution edge = our probability - average quoted execution price
expected value = shares * execution edge
```

The second quantity is the one that matters before a buy because shallow LMSR liquidity can move price materially.

## Current pipeline

```text
Delphi market + public history + external evidence
        ↓
MarketSnapshot / ReplayView
        ↓
MarketBelief
        ↓
exact quoteBuy(shares)
        ↓
ExecutionEdge
        ↓
risk / freshness gates
        ↓
TradeProposal | Refusal
        ↓
forecast + evidence record
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
```

## Commands

```bash
npm run build
npm test
npm run check

# live competition inspection
npm run scan
npm run evaluate -- <market> <outcome-index> <our-prob> <confidence> [account-value] [exposure]

# M1: evidence archive and replay
npm run history:archive
npm run record:snapshot -- <market>
npm run replay -- data/history/latest.json <market> <cutoff-iso-or-ms>
npm run score:forecasts

# M2: crypto threshold forecaster
npm run forecast:crypto -- <market> [account-value] [market-exposure]
```

`evaluate` persists the forecast and contemporaneous market probability to `data/forecasts.jsonl`. Once that market resolves, `score:forecasts` compares our Brier score and log loss against the market probability observed at forecast time.

`history:archive` reads the official Delphi subgraph, freezes buys, sells, settlements, failures, market metadata, and the subgraph indexing checkpoint into `data/history/latest.json`, and prints a SHA-256 evidence hash.

`forecast:crypto` supports a deliberately narrow class of terminal crypto threshold markets. It parses the market semantics, fetches Binance Futures best bid/ask midpoint and one-minute closes, estimates blended realized volatility, produces a zero-drift GBM terminal probability, persists the forecast, and runs the result through the same Delphi quote ladder and execution-edge policy as manual evaluation.

## Replay truth boundary

Historical on-chain events establish trades and resolutions. They do **not** by themselves reconstruct every past marginal LMSR probability. `0-1` therefore does two things:

1. imports historical trade and settlement events from Delphi/Goldsky;
2. records live probability snapshots from today onward.

`ReplayClock.at(market, cutoff)` exposes only events whose timestamps are at or before the requested cutoff. Settlement data is not visible before settlement, and forecasts created at or after settlement are excluded from scoring as hindsight.

## Implemented

### M0 — competition kernel

- competition-testnet configuration;
- live market discovery;
- canonical `MarketBelief` and `TradeProposal` schemas;
- spot-edge calculation;
- quoted average-price / execution-edge calculation;
- deterministic freshness, confidence, edge, impact, and exposure gates;
- quote ladder sizing over Delphi's real `quoteBuy` path;
- explicit refusals instead of forced trades.

### M1 — archive and replay foundation

- normalized buy/sell history ingestion;
- settlement/failure ingestion;
- subgraph freshness/error checkpoint;
- market catalog archive;
- deterministic chronological ordering and deduplication;
- immutable evidence hashing;
- append-only live market observations;
- cutoff-safe replay clock;
- forecast persistence;
- Brier and log-loss scoring against contemporaneous market probability;
- tests against settlement/future-data leakage.

### M2a — crypto threshold baseline

- conservative terminal-threshold market parser;
- BTC/ETH/SOL/BNB Binance Futures mapping;
- best-bid/best-ask midpoint reference price;
- one-minute realized-volatility estimator;
- short/long volatility blend;
- zero-drift GBM terminal probability baseline;
- probability/confidence separation;
- forecast persistence into the M1 ledger;
- automatic quote/risk evaluation after forecasting;
- deterministic parser/model tests;
- explicit refusal of path-dependent hit/touch/ever markets.

This is a baseline forecaster, not yet a claim of profitable alpha. See `docs/CRYPTO_FORECASTER.md`.

## Not yet claimed

- profitable forecasting alpha;
- autonomous signing/execution;
- competitor-signal lift;
- Engram execution memory;
- Cinch capital containment;
- sports/news forecasting verticals;
- multi-source Research/Opportunity Foundry forecasting.

These are promoted only after their experiment gates are green.

## Source truth

Competition semantics are implemented against official Gensyn Delphi reference material. Competition markets use LMSR rather than Delphi's regular DPM mechanism, winning shares redeem 1:1, and quote paths must be consulted before execution because shallow liquidity can materially change average execution price.

See `docs/BUILD_ORDER.md`, `docs/ASSET_IMPORT_MAP.md`, and `docs/CRYPTO_FORECASTER.md`.

## License

MIT
