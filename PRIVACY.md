# Challenge data and privacy

FlightSweeper WebMCP Challenge Edition runs entirely in the visitor's browser. It does not send mission or receipt data to FlightSweeper, FinSync LLC, an airline, a supplier, or an analytics provider.

## Data stored on this device

The app stores one versioned record under `flightsweeper.webmcp.challenge.v1`. It may contain synthetic route and policy fields, sandbox offers and selection state, activity and policy decisions, idempotency keys entered for sandbox execution, and synthetic receipts.

The app does not request or store names, contact details, account credentials, card details, passport data, loyalty numbers, or real booking records. Do not enter personal or payment information into mission fields or idempotency keys.

## Retention and deletion

The browser retains the record until site data is cleared or **Erase challenge data** is confirmed. Resetting a transaction or starting a mission preserves prior receipts. Erasing challenge data removes the complete app record from that browser and starts a synthetic mission.

## Network behavior

This is a static site. Fonts, images, styles, and scripts are served from the same origin. The app makes no analytics, advertising, supplier, payment, or other data requests. The hosting provider may process ordinary request metadata under its own terms when serving public files.

## Scope

This notice describes only this public challenge repository and deployment. It is not the privacy notice for private or production FlightSweeper services.
