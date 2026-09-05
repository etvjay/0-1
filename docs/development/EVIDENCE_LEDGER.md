# 0-1 Binance Evidence Ledger

Evidence states:

```text
UNVERIFIED
SIMULATED_PASS
LOCAL_PASS
SHADOW_PASS
TESTNET_PASS
LIVE_PASS
PUBLIC_EVALUATOR_PASS
PRODUCTION_PASS
FAILED
BLOCKED
```

| Claim | State | Evidence | Notes |
|---|---|---|---|
| Existing Delphi trade-policy kernel exists | LOCAL_PASS | existing repo; re-run tests in integration env | Existing truth |
| Existing Evidence Council exists | LOCAL_PASS | existing repo; re-run tests | Deterministic council |
| Existing Opportunity Hunter exists | LOCAL_PASS | existing repo | Shadow-only semantics |
| Binance architecture specified | UNVERIFIED | canonical docs | Design truth only |
| Binance `TradeThesis` implemented | UNVERIFIED | — | Target |
| Binance `ExecutionMandate` implemented | UNVERIFIED | — | Target |
| Mandate state machine implemented | UNVERIFIED | — | Target |
| Binance live market state connected | UNVERIFIED | — | Target |
| Binance account state connected | UNVERIFIED | — | Target |
| Hot evaluator negative tests pass | UNVERIFIED | — | Target |
| Full shadow workflow works | UNVERIFIED | — | Target |
| Bounded live Binance execution works | UNVERIFIED | — | Do not claim yet |
