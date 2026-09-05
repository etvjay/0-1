# Binance Source Truth

Use current official Binance sources before implementing or judging Binance-specific behavior.

Precedence: S0 Agent OS/MCP official docs; S1 exact Binance Developer Docs product family; S2 exact endpoint/reference/changelog; S3 official clarification; S4 0-1 canonical docs; S5 repo examples; S6 secondary/search/model memory only for discovery.

Official roots: https://developers.binance.com/ ; https://www.binance.com/en/support/announcement/detail/07d45cdd3831498f8a4ff339031a8480 ; MCP `https://agent.binance.com/mcp/agentic`.

Do not mix Spot, Margin, USD-M Futures, COIN-M Futures, Portfolio Margin, or Options semantics. For consequential endpoint/auth/permission/stream/order/filter/error behavior record product, API family, method, official source URL, verification time, and supported claim.

If official source is inaccessible/ambiguous, use `SOURCE_UNVERIFIED` or `BLOCKED_SOURCE`; do not guess. If Binance truth conflicts with 0-1 architecture, emit `SOURCE_CONFLICT` for orchestrator/reviewer resolution.