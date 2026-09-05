# 0-1 Binance Requirements

## External target

**Binance Agent OS Mini Hackathon — Track A**. Current published deadline used by this build: **September 8, 2026 at 23:59 UTC**. Track A is for agents built with Binance Agent OS; the submission path includes demo/video and GitHub where applicable. Refresh this file if Binance publishes changed requirements.

## Product requirements

- `R-PROD-001`: model output may never directly become an exchange order.
- `R-PROD-002`: accepted thesis is revalidated against fresh market/account state.
- `R-PROD-003`: forecast edge is separated from execution-adjusted edge.
- `R-PROD-004`: refusal is structured and first-class.
- `R-PROD-005`: action/refusal lineage is workflow → thesis → council → mandate → state versions → assessment → receipt.

## Architecture requirements

- reasoning workers have no exchange write authority;
- hot path performs no LLM call;
- one writer owns place/cancel authority;
- mandates are immutable and single-use in MVP;
- market/account state is versioned/freshness-bounded;
- ambiguous submission is reconciled before retry.

## Demo requirements

Show Agent OS-connected state, parallel bounded analysis, Council accept/refuse, immutable mandate with TTL/bounds, fast current-state validation, one concrete refusal with calculations, one bounded execution/proposal, and receipt/reconciliation/provenance.

## Claim limits

Do not claim profitable alpha, HFT performance, exactly-once execution, production safety, or live trade success without matching evidence.
