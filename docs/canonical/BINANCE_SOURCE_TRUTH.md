# Binance Source Truth

**Purpose:** govern every Binance-specific implementation decision in 0-1.

Use this precedence:

```text
S0 — Current official Binance Agent OS / MCP documentation
S1 — Current official Binance Developer Docs for the exact selected product/API family
S2 — Current official endpoint/reference/changelog for the exact method
S3 — Current official Binance clarification when S0-S2 are silent
S4 — 0-1 canonical product documents
S5 — repo code/tests/examples
S6 — secondary articles/search/model memory (discovery only)
```

Never establish endpoint names, authentication, permissions, limits, stream/order semantics, fields, errors, or supported capabilities from S6.

Official roots:
- https://developers.binance.com/
- https://www.binance.com/en/support/announcement/detail/07d45cdd3831498f8a4ff339031a8480
- https://www.binance.com/en/blog/ecosystem/5991233187660196794
- MCP endpoint: `https://agent.binance.com/mcp/agentic`

Never silently mix Spot, Margin, USD-M Futures, COIN-M Futures, Portfolio Margin, or Options semantics.

For every consequential Binance implementation claim record:

```yaml
binance_product:
api_family:
transport:
endpoint_or_method:
source_url:
source_class: S0 | S1 | S2 | S3
verified_at:
claim_supported:
```

Re-check the official source during integration-changing tasks. If inaccessible or ambiguous, return `SOURCE_UNVERIFIED` / `BLOCKED_SOURCE` rather than guessing.

If Binance official truth conflicts with 0-1 canonical architecture, emit `SOURCE_CONFLICT` and stop for orchestrator/reviewer resolution. Binance sources govern what Binance supports; 0-1 canonical docs govern what product and safety invariants we require. Neither silently overrides the other.