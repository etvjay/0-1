# Crypto Forecaster v1

Status: **implemented baseline, not yet proven alpha**.

## Purpose

Provide a deterministic probability estimate for a narrow class of Delphi competition markets:

```text
terminal crypto price
    relative to fixed threshold
    at a known future resolution time
```

Examples of supported semantics:

- `Will Bitcoin be above $120,000 at settlement?`
- `Will ETH be below $4,000 at settlement?`

Explicitly unsupported in v1:

- touch/hit/ever/any-time-before markets;
- ranges or multi-bucket outcomes;
- questions whose settlement reference is not a terminal price;
- unsupported assets;
- ambiguous outcome labels.

Unsupported markets are refused rather than coerced into the model.

## Source provenance

Reference-price semantics are adapted from:

- repository: `Jaydearcadian/zo-market-maker-ts`
- source path: `src/pricing/binance.ts`
- observed source behavior: Binance Futures `bookTicker`, using `(bestBid + bestAsk) / 2` as reference midpoint, with liveness/reconnect handling in the original daemon.

0-1 does **not** import the source repository's market-making strategy.

The first 0-1 forecaster uses Binance Futures REST endpoints instead of the websocket daemon:

- `bookTicker` for contemporaneous best bid/ask midpoint;
- one-minute klines for realized volatility.

Reason: the initial forecasting experiment must be deterministic, inspectable and easy to invoke from a single process. Streaming ingestion can replace polling without changing the forecasting interface.

## Model

`gbm-zero-drift-rv-v1`

Inputs:

```text
S0 = current Binance Futures midpoint
K  = market threshold
T  = time until Delphi resolution
σ  = blended realized volatility
```

Realized volatility:

- short window: last 31 one-minute closes;
- long window: up to last 241 one-minute closes;
- blend: `0.65 * shortRV + 0.35 * longRV`;
- each RV is annualized from log-return sample variance.

Terminal model:

```text
ln(ST / S0) ~ Normal(-0.5 * σ²T, σ²T)
```

This is deliberately a **zero-drift baseline**, not a claim that crypto returns are truly GBM or driftless. It lets us begin collecting a calibrated competition-specific benchmark before adding momentum, implied volatility, funding, options skew or event features.

## Confidence

Probability and confidence are separate.

The v1 confidence starts from parser confidence and is reduced for:

- wide Binance bid/ask spread;
- insufficient long-window volatility samples;
- long forecast horizons.

Confidence does not alter the model probability. It controls downstream policy eligibility.

## End-to-end path

```text
Delphi market
  -> conservative semantic parser
  -> resolution time
  -> Binance midpoint + minute closes
  -> blended realized volatility
  -> probability
  -> contemporaneous Delphi probability
  -> forecast record
  -> Delphi quote ladder
  -> executable-edge gates
  -> PROPOSED | REFUSED
```

No transaction signing occurs in this path.

## Experiment contract

Every forecast is persisted to the same M1 forecast ledger before resolution. After settlement, the existing scorer computes:

- Brier score;
- log loss;
- Brier skill versus contemporaneous Delphi market probability;
- log-loss skill versus contemporaneous Delphi market probability.

Promotion criterion is **not** a few winning calls. The model must demonstrate positive out-of-sample skill on a meaningful set of resolved supported markets.

## Next model features

Add one at a time and run ablations:

1. multi-horizon momentum / trend;
2. volatility regime and jump detection;
3. perpetual funding / basis;
4. options implied volatility/skew where available;
5. cross-exchange reference-price disagreement;
6. time-of-day and scheduled-event state.

Every feature must prove incremental calibration or P&L lift on temporal holdout data.
