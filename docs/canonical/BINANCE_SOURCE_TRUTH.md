# Binance Source Truth

**Purpose:** govern every Binance-specific implementation decision in 0-1.

This file defines which external sources coding agents must trust, how conflicts are handled, and what may not be inferred from memory.

## 1. Source precedence

Use this order, highest authority first:

```text
S0 — Current official Binance Agent OS / MCP announcement and support documentation
S1 — Current official Binance Developer Docs for the exact selected product/API family
S2 — Current official endpoint schema/reference/changelog for the exact method being implemented
S3 — Current official Binance developer/community clarification, only when S0-S2 are silent
S4 — 0-1 canonical product documents and architecture
S5 — Existing repo code/tests/examples
S6 — Secondary articles, snippets, search results, model memory
```

S6 may be used for discovery only. It may never establish endpoint names, authentication, permissions, limits, order semantics, event schemas, error handling, or supported capabilities.

## 2. Official Binance roots

### Agent OS / MCP

- Binance Agent OS announcement: https://www.binance.com/en/support/announcement/detail/07d45cdd3831498f8a4ff339031a8480
- Binance Agent OS overview/blog: https://www.binance.com/en/blog/ecosystem/5991233187660196794
- Binance MCP endpoint: `https://agent.binance.com/mcp/agentic`
- Binance MCP support documentation/FAQ on `binance.com`.

Canonical current Agent OS facts include:

- Agent OS is broader than MCP; MCP is one connection layer.
- Access is permissioned and uses a dedicated Agentic sub-account.
- Supported capabilities depend on scopes, account eligibility, product availability and region.
- Market data can include tickers, order books, candlesticks and funding rates.
- Trading may cover supported Spot, Margin, Convert, USD-M Futures and COIN-M Futures functions where authorized.
- MCP does not provide an external-withdrawal scope.

### Binance Developer Docs

Root: https://developers.binance.com/

Use the documentation for the exact product selected by the implementation.

Examples:

- Spot WebSocket API user data:
  https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/user-data-stream

- Spot WebSocket API account/reference:
  https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/account

- Spot WebSocket trading reference (`order.place` and related methods):
  https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/ws-api/trade

- USD-M Futures WebSocket API user data:
  https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/ws-api/user-data-streams

For other market streams, account endpoints, trading methods, rate limits, filters, or schemas, navigate from the official Developer Docs for the selected product rather than guessing URLs or copying another product family.

## 3. Product-family isolation

Never silently mix semantics across:

```text
Spot
Margin
USD-M Futures
COIN-M Futures
Portfolio Margin
Options
```

A COIN-M websocket example is not evidence for USD-M behavior.
A Spot `order.place` field is not evidence that a Futures order method accepts the same fields.

Before implementing an adapter, declare:

```yaml
binance_product:
api_family:
transport:
endpoint_or_method:
official_source:
verified_at:
```

## 4. Freshness rule

Binance API documentation changes.

For any integration-changing task, the coding agent must re-check the relevant official page during that task rather than relying only on this cached document.

Record:

```yaml
source_url:
source_title:
source_class: S0 | S1 | S2 | S3
verified_at:
claim_supported:
```

If the agent cannot access the official source needed to verify a consequential integration detail, mark that detail `SOURCE_UNVERIFIED` or `BLOCKED_SOURCE`. Do not invent it.

## 5. Conflict rule

If official Binance documentation conflicts with 0-1 architecture:

```text
DO NOT silently mutate 0-1.
DO NOT ignore Binance.
```

Instead emit:

```yaml
status: SOURCE_CONFLICT
binance_source:
repo_rule:
conflict:
impact:
proposed_resolution:
```

The orchestrator/reviewer decides whether a Product/Architecture ADR is required.

## 6. Implementation rule

Every Binance-specific PR/change must identify the official source for each consequential claim involving:

- endpoint/method name;
- product availability;
- authentication/signing;
- permission/scope;
- market/account stream semantics;
- ordering guarantees;
- reconnect/keepalive behavior;
- rate limits;
- symbol/order filters;
- order types/time-in-force;
- client order identifiers;
- acknowledgement/fill/rejection semantics;
- error codes;
- position/account semantics.

## 7. Review gate

A reviewer must reject or block Binance integration code when:

- it cites no official source for consequential API behavior;
- it uses the wrong product family documentation;
- it implements fields/endpoints from model memory;
- it treats a blog/community example as stronger than current API reference;
- documentation and implementation disagree without an explicit source-conflict record;
- a cached source is contradicted by newer official documentation.

## 8. Architecture vs external truth

Binance sources govern **what Binance actually supports and how it behaves**.

0-1 canonical documents govern **what product we are building and which safety/authority invariants we require**.

Neither may silently override the other.

Correct resolution:

```text
Binance capability truth
        +
0-1 product truth
        ↓
explicit compatible implementation
```

If compatibility cannot be established, the task is blocked or the architecture must be deliberately recanonicalized.