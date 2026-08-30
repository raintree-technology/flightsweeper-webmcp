# Public agent API contract

FlightSweeper Challenge Edition publishes two agent-facing interfaces. Both expose synthetic challenge information. Neither interface can read a visitor's browser mission, charge a card, contact a supplier, or create a reservation.

**Audience:** Judges and developers inspecting the WebMCP implementation

**Lifecycle:** Public challenge interface, version `1.0.0`

**Canonical host:** `https://flightsweeper-webmcp.vercel.app`

## Choose an interface

| Interface | Purpose | Access | Side effects |
| --- | --- | --- | --- |
| Browser WebMCP | Operate the synthetic mission visible on the page | Browser-local and state-dependent | Local sandbox state only |
| Remote MCP | Inspect challenge capabilities, contracts, inventory, and safety behavior | Anonymous, read-only HTTPS | None |
| Agent manifest | Discover both interfaces and their schemas | Anonymous `GET` or `HEAD` | None |

The browser WebMCP contract is documented in [AGENT_CONTRACT.md](AGENT_CONTRACT.md). The canonical machine-readable manifest is available at [`/agent-tools.json`](https://flightsweeper-webmcp.vercel.app/agent-tools.json).

## First request

Read the manifest without creating credentials:

```sh
curl --fail-with-body \
  https://flightsweeper-webmcp.vercel.app/agent-tools.json
```

Expected result: HTTP `200` with `schemaVersion`, the synthetic-only boundary, all 10 browser WebMCP contracts, and all four remote MCP contracts.

Use an MCP client that supports Streamable HTTP to connect to:

```text
https://flightsweeper-webmcp.vercel.app/mcp
```

The server currently supports MCP protocol versions `2025-11-25` and `2025-06-18`. The manifest is the source of truth for the current versions and tool schemas.

List the public read-only tools with a raw protocol request:

```sh
curl --fail-with-body \
  --request POST \
  --header 'Accept: application/json, text/event-stream' \
  --header 'Content-Type: application/json' \
  --header 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":"tools-1","method":"tools/list","params":{}}' \
  https://flightsweeper-webmcp.vercel.app/mcp
```

Expected result: HTTP `200` with four tools. Each tool is read-only, accepts an empty object, and publishes a closed output schema.

## Remote MCP tools

| Tool | Result |
| --- | --- |
| `get_challenge_capabilities` | Challenge mode, interface counts, transaction boundary, and canonical URL |
| `get_flight_tool_contracts` | The bounded browser-local WebMCP contracts and lifecycle rule |
| `get_sandbox_inventory` | Synthetic route and supplier-connectivity boundary |
| `get_safety_model` | Authority, policy, repeat-safety, revocation, and privacy rules |

Every remote tool accepts an empty object, rejects unknown fields, is marked read-only, and returns a closed structured-output schema. Calls are safe to retry because they do not mutate server or browser state.

## HTTP contract

### Agent manifest

- Methods: `GET`, `HEAD`, `OPTIONS`
- Cache: public for 1 hour; stale reuse is allowed for 24 hours while revalidation occurs
- Cross-origin reads: allowed
- Credentials: not required

### Remote MCP

- Methods: `POST`, `OPTIONS`
- Request media type: `application/json`
- Response storage: disabled with `Cache-Control: no-store`
- Request body: maximum 32 KiB
- Defensive rate limit: 30 requests per 60-second warm-instance window, counted by the deployment-provided forwarded address
- Credentials and cookies: rejected
- Browser origins: accepted only from the canonical challenge origin when an `Origin` header is present
- Correlation: responses return `X-Request-ID`; a caller may supply 1–64 letters, numbers, periods, underscores, colons, or hyphens

The in-memory rate limit is a defensive per-instance bound, not a distributed account quota or service-level guarantee. Serverless instances do not share counters.

## Deliberately absent surfaces

The remote API has no authentication lifecycle, tenant data, pagination, filtering, field expansion, bulk mutation, asynchronous operation, event delivery, webhook, upload, or long-running task. All four tools compute bounded results from versioned source fixtures during one request.

`X-Request-ID` correlates a request. It never grants authority and never deduplicates an operation. The browser-local `purchase_selected_offer` tool uses its separate bounded idempotency key and application state for repeat safety.

## Errors and recovery

The remote MCP uses JSON-RPC error objects. Callers should branch on `error.code`, not parse `error.message`.

| HTTP | JSON-RPC code | Meaning | Caller action |
| --- | --- | --- | --- |
| `400` | `-32700` | Invalid JSON | Correct the JSON and retry |
| `400` | `-32600` | Invalid request, missing body, or oversized body | Correct the request; do not retry unchanged |
| `405` | `-32600` | Unsupported HTTP method | Use `POST` or `OPTIONS` |
| `400` | `-32001` | Credentials were supplied | Remove authorization and cookies |
| `403` | `-32004` | Origin or host is outside the public boundary | Use the canonical endpoint |
| `429` | `-32029` | Defensive request limit exceeded | Wait for `Retry-After` |
| `503` | `-32003` | The public MCP kill switch is active | Wait for `Retry-After` or use the static manifest |
| `500` | `-32603` | The server could not complete a valid request | Report `X-Request-ID`; do not retry in a tight loop |

An unknown JSON-RPC method returns code `-32601`. A missing tool or invalid tool argument returns an MCP tool result with `isError: true` and code `-32602` in the safe text detail. Correct the tool name or arguments before retrying.

Rate-limit responses also expose `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`. Include `X-Request-ID` when reporting a failed request.

## Compatibility and change policy

The public manifest carries the interface version, supported MCP protocol versions, exact input and output schemas, and a modified date. Compatible changes are additive. A breaking change requires a new interface version and an updated manifest, documentation, contract tests, and migration note before release.

This challenge API has no uptime or long-term support commitment. The repository's current `main` branch and public challenge deployment are the supported surfaces. See [SECURITY.md](SECURITY.md) for private vulnerability reporting and [STANDARDS.md](STANDARDS.md) for applied requirements and explicit limits.
