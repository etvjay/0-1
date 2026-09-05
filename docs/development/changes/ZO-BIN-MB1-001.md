# ZO-BIN-MB1-001 — Domain + Mandate Compiler

```yaml
change_id: ZO-BIN-MB1-001
owner_role: builder
objective: Implement canonical Binance domain types and deterministic compileMandate().
canonical_component: domain / authority compiler
status: APPROVED_FOR_IMPLEMENTATION
allowed_files:
  - src/domain/binance-types.ts
  - src/domain/mandate.ts
  - test/mandate-compile.test.ts
forbidden_files:
  - src/runtime/**
  - src/venues/**
  - docs/canonical/**
requirements:
  - TradeThesis matches PRODUCT_SCHEMA
  - ExecutionMandate matches PRODUCT_SCHEMA
  - compiler cannot broaden venue/symbol/direction
  - compiler cannot loosen operator policy
  - mandate is immutable-by-construction
  - explicit TTL and provenance hashes
negative_tests_required:
  - direction mismatch rejected
  - venue/symbol mismatch rejected
  - policy widening rejected
  - expired thesis rejected
  - invalid economic/risk bounds rejected
evidence_required:
  - npm run check
  - npm test
  - exact commit SHA
```
