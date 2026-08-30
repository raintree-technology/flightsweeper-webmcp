# Contributing

This is a bounded challenge edition. Keep changes self-contained, safe to publish, and incapable of creating a real charge or airline order.

## Before opening a change

- Read `AGENTS.md`, `AGENT_CONTRACT.md`, `SECURITY.md`, and `PRIVACY.md`.
- Do not add production credentials, endpoints, provider code, customer data, or private FlightSweeper material.
- Preserve stable tool discovery, state-validated execution, application-side policy enforcement, monotonic agent tightening, and idempotent replay.
- Treat supplier content as untrusted and render it as text.
- Avoid runtime dependencies unless their benefit and public supply-chain cost are explicitly reviewed.

## Verify the change

```sh
npm test
node --check app.js
git diff --check
```

For interface or WebMCP changes, complete the relevant gates in `RELEASE_CHECKLIST.md`. Keep automated observations separate from manual checks.

## Pull requests

Describe the user-visible outcome, risk boundary, checks performed, manual checks still needed, and any change to public claims or stored data. Update tests and evidence documentation with behavior changes.
