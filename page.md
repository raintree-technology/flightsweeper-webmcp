# FlightSweeper WebMCP Challenge Edition

FlightSweeper demonstrates bounded, policy-enforced agent operation inside a visible browser workspace.

## Boundary

This is a synthetic sandbox. It cannot charge a card, contact a supplier, create a reservation, or issue a real ticket. Do not enter passenger identity or payment information.

## Agent interfaces

- Browser-local WebMCP tools share the visible mission state with the user.
- The public remote MCP exposes challenge documentation and fixture metadata only.
- The normal human interface remains usable when WebMCP is unavailable.

## Safety

Agents can tighten but never expand a human mandate. Purchase policy is evaluated from stored application state. Quote changes invalidate authorization. Revocation blocks future execution. Idempotent retries replay the original synthetic receipt.
