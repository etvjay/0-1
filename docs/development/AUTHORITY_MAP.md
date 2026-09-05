# 0-1 Binance Authority Map

| Component | Market read | Account read | Research | Thesis | Issue mandate | Validate | Place/cancel | Ground Truth |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Opportunity scanner | ✓ | optional | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Evidence worker | optional | ✗ | ✓ | opinion only | ✗ | ✗ | ✗ | ✗ |
| Advocate worker | ✓ | ✗ | via evidence | opinion only | ✗ | ✗ | ✗ | ✗ |
| Oppose worker | ✓ | ✗ | via evidence | opinion only | ✗ | ✗ | ✗ | ✗ |
| Market-analysis worker | ✓ | ✗ | ✗ | analysis only | ✗ | ✗ | ✗ | ✗ |
| Evidence Council | artifacts | ✗ | ✗ | decision | ✗ | ✗ | ✗ | ✗ |
| Mandate compiler | anchor | policy | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Hot evaluator | local | local | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| OrderWriter | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | **✓** | ✗ |
| Reviewer agent | repo/evidence | repo/evidence | docs | ✗ | ✗ | ✗ | ✗ | verdict only |
| Executor/integrator | repo | runtime | docs | ✗ | ✗ | ✗ | approved runtime only | propose transition |
| Ground Truth maintainer | evidence | evidence | docs | ✗ | ✗ | ✗ | ✗ | **✓ after gate** |

Reasoning authority and financial write authority must not collapse into one component.
