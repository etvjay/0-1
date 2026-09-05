# ZO-BIN-MB1-E — Independent Adversarial / Property Test Harness

```yaml
change_id: ZO-BIN-MB1-E
role: tester
branch: agent/mb1-adversarial-tests
base_commit: 936e63228b4e3308a0d1779957e304f0f011a507

depends_on:
  - integrated outputs from A/B/C/D

objective:
  Independently pressure-test the mandate kernel rather than reproduce builder happy paths.

canonical_component:
  verification / evidence

requirements:
  - treat canonical docs as oracle, not builder explanations
  - add negative mutations for every hard M-B1 invariant
  - test race/replay/crash scenarios around supersession and consumption
  - test stale-state and boundary conditions at exact thresholds
  - test deterministic repeatability
  - test that refusal cannot silently degrade into execution
  - test that old/superseded authority cannot reactivate
  - test arbitrary malformed/non-finite inputs fail closed

allowed_files:
  - test/**
  - tests/**
  - scripts/**test**
  - fixtures/**
  - docs/development/changes/ZO-BIN-MB1-E.md

forbidden_files:
  - production src/** except a minimal testability hook explicitly approved by review
  - docs/canonical/**

negative_mutations:
  - extend mandate expiry into past
  - swap symbol after issuance
  - widen max price / max notional
  - use stale market version
  - use stale account version
  - exceed spread/slippage/funding ceilings by epsilon
  - set executable edge just below floor
  - double consume mandate
  - supersede then trigger old mandate
  - crash/reload after consume-before-send
  - replay prior client identity
  - malformed NaN/infinite economics

required_commands:
  - npm run check
  - npm test

evidence_required:
  - mutation matrix
  - failing-before/fixed-after receipts where defects found
  - exact commit SHA
  - uncovered invariant list

verdict_output:
  - PASS
  - FAIL
  - BLOCKED

must_not:
  - repair production code and then self-certify it
  - weaken tests to match implementation
  - claim Binance live evidence
```
