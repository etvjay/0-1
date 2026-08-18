# 0-1

**Evidence-bounded autonomous trading for the Delphi Agent Competition.**

`0-1` is a competition-native research and execution system for Delphi's LMSR prediction markets. The first milestone is intentionally narrow: read live competition markets, represent an explicit probability belief, quote exact LMSR execution cost, reject stale or weak-edge proposals, and emit a deterministic trade proposal before any signing path exists.

## Governing objective

Maximize competition P&L without confusing a model opinion with executable edge.

On the Delphi competition, a winning share redeems 1:1 and the LMSR spot price is the market-implied probability. Therefore:

```text
spot edge      = our probability - market probability
execution edge = our probability - average quoted execution price
expected value = shares * execution edge
```

The second quantity is the one that matters before a buy because shallow LMSR liquidity can move price materially.

## v0 pipeline

```text
Delphi competition market
        ↓
MarketSnapshot
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
JSON evidence record
```

No autonomous transaction signing is enabled in v0.

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

Signing credentials are deliberately not required for the read-only v0 scan.

## Commands

```bash
npm run build       # strict TypeScript build
npm test            # deterministic domain tests
npm run check       # build + test
npm run scan        # inspect active competition markets
```

## Current boundaries

Implemented in the first vertical:

- competition-network configuration;
- live market discovery;
- canonical `MarketBelief` and `TradeProposal` schemas;
- spot-edge calculation;
- quoted average-price / execution-edge calculation;
- deterministic freshness, confidence, edge, impact, and exposure gates;
- quote ladder sizing over Delphi's real `quoteBuy` path;
- explicit refusals instead of forced trades.

Not yet claimed:

- profitable forecasting alpha;
- autonomous signing/execution;
- competitor-copying strategy;
- historical backtest/calibration;
- Engram execution memory;
- Cinch capital containment;
- multi-source Research/Opportunity Foundry forecasting.

Those are added only after this kernel is green and reproducible.

## Source truth

Competition semantics are implemented against the official Gensyn Delphi skill/reference material. In particular, competition markets use LMSR rather than Delphi's regular DPM mechanism, winning shares redeem 1:1, and `quoteBuy` must be consulted before execution because liquidity parameter `b` can be shallow.

## License

MIT
