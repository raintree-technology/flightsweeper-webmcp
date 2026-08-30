# FlightSweeper WebMCP Challenge Edition

FlightSweeper lets a browser agent complete a sandbox flight purchase without letting the model set its own authority.

The traveler sets exact, revocable limits. The agent searches and executes. FlightSweeper independently approves or denies the transaction and records why.

**Project:** Public, MIT-licensed WebMCP Challenge sandbox for judges and developers evaluating delegated transactions

**Status:** Submitted on August 28, 2026; available for public evaluation

**Live challenge app:** [webmcp.flightsweeper.com](https://webmcp.flightsweeper.com)

**Source:** [github.com/raintree-technology/flightsweeper-webmcp](https://github.com/raintree-technology/flightsweeper-webmcp)

**Submitted project:** [FlightSweeper on Devpost](https://devpost.com/software/flightsweeper)

**Demo:** [Watch the 2:23 public video](https://youtu.be/pBOZ6nnwNKs)

This challenge edition never creates a real charge or airline order. It contains no production FlightSweeper credentials, customer data, or private provider implementation. FinSync LLC operates FlightSweeper and is registered as a California Seller of Travel, CST 2172984-70. Registration as a seller of travel does not constitute approval by the State of California.

## Try the core flow

**Prerequisite:** Use ChatGPT desktop’s in-app browser or Chrome 149+ with WebMCP enabled.

1. Open the [live challenge app](https://webmcp.flightsweeper.com).
2. Send the prompt below to the browser agent.
3. Watch the mission, offer, and evidence states change as the agent calls the registered tools.
4. Open **Activity** and **Evidence** to inspect the denial, authorization, ticket, and replay records.

> Read the active flight mission and search for flights. Compare the visible offers. Select and evaluate the non-refundable Meridian offer, then explain why FlightSweeper denied it. Tighten the mission to nonstop, select Coast Air, refresh and evaluate it, then purchase it with idempotency key `judge-demo-1`. Repeat the purchase, revoke future authority, and retrieve the booking receipt.

What this proves:

- Untrusted supplier instructions cannot override the traveler’s stored rules.
- The agent can narrow authority but cannot grant itself more.
- A repeated purchase returns the original sandbox ticket instead of creating another transaction.

## What is new for the challenge

The public challenge edition was created for the WebMCP Challenge after its August 25, 2026 kickoff. Production FlightSweeper remains private and unchanged. The challenge work is the self-contained sandbox, its state-aware WebMCP tool surface, the monotonic authority model, adversarial supplier fixture, independent policy and evidence engine, idempotent ticket replay, and the visible human-agent transaction workspace in this repository.

## Why WebMCP

The webpage, traveler, and agent share one transaction state. The traveler can replace or expand authority through the human interface. The agent can only narrow it. Tools appear and disappear as the mission moves from draft to search, selection, authorization, and ticketing.

One sandbox supplier result includes an adversarial instruction. Provider-backed tools mark their content untrusted, and the application policy engine independently rejects the offer because it violates the stored mandate.

The challenge edition isolates the transaction rail. It demonstrates authority, policy, quote-binding, revocation, and idempotency controls. A live provider connection would require additional provider, payment, identity, operational, and regulatory controls.

```mermaid
flowchart LR
  H[Human mandate] --> P[FlightSweeper policy]
  A[Browser agent] -->|WebMCP tools| P
  S[Untrusted supplier offers] --> P
  P -->|deny with evidence| D[Denial receipt]
  P -->|authorize exact quote| X[Idempotent sandbox purchase]
  X --> B[Canonical ticket receipt]
  H -->|revoke or tighten| P
```

## Run locally

```sh
npm start
```

Open <http://localhost:4173>. Use the latest ChatGPT desktop in-app browser or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`. The on-page controls exercise the same application callbacks when WebMCP is unavailable.

Expected result: create or edit a synthetic mandate, search three fixture offers, and advance an eligible offer through selection, evaluation, and one repeat-safe sandbox ticket. The activity and evidence drawers show attributed actions and durable receipts.

## Test

```sh
npm test
```

## WebMCP tools

The browser entry point keeps all 10 contracts discoverable so an agent can plan the complete workflow. Every contract publishes bounded input and result schemas. Application-side state and policy checks reject premature or prohibited actions with typed recovery guidance. This excerpt is abridged from the browser implementation:

```js
await document.modelContext.registerTool({
  name: contract.name,
  description: contract.description,
  inputSchema: contract.inputSchema,
  outputSchema: contract.outputSchema,
  annotations: {
    readOnlyHint: contract.readOnlyHint,
    untrustedContentHint: contract.untrustedContentHint,
  },
  async execute(rawInput) {
    return toolResult(
      await toolExecutors[contract.name](
        validateToolInput(contract, normalizeInput(rawInput)),
      ),
    );
  },
}, { signal: toolController.signal });
```

See the complete registration lifecycle in [`app.js`](app.js) and the bounded contracts in [`tool-contracts.js`](tool-contracts.js).

- `read_flight_mission`
- `search_flights`
- `tighten_flight_mission`
- `compare_visible_offers`
- `select_offer`
- `refresh_selected_offer`
- `evaluate_purchase`
- `purchase_selected_offer`
- `get_booking_receipt`
- `revoke_purchase_authority`

Every result uses the same envelope: `data`, `missionStatus`, and `validNextActions` on success; `error`, `missionStatus`, and `validNextActions` on failure. Every purchase is re-evaluated from stored mission and offer state. Tool callers cannot supply a price, card, passenger identity, or authorization decision. After a ticket exists, any later purchase retry returns the original booking—even with a different retry key or after authority is revoked—rather than creating another ticket.

## Safety properties

- Human policy changes may replace or expand authority; agent changes are monotonic tightening only.
- Quote selection and authorization evidence are cleared whenever the mission changes.
- Supplier-backed outputs use `untrustedContentHint`.
- Price, itinerary, policy, expiry, and authority are reloaded from application state at execution.
- Purchase requires authorization evidence bound to the selected offer, policy version, quote version, price, and currency.
- Expired authority blocks consequential tools at execution; saving the human mandate issues a new 24-hour authority window.
- Idempotency records and transaction receipts survive page reloads.
- Revocation blocks future purchases but does not erase prior evidence.

## Project structure

- `engine.js` contains pure mission, policy, receipt, and purchase rules.
- `tool-contracts.js` defines the public WebMCP surface, result envelopes, and valid-next-action model.
- `state.js` owns the versioned browser persistence contract.
- `app.js` binds the human interface and WebMCP callbacks to the same state transitions.

See [SUBMISSION.md](SUBMISSION.md) for the Devpost description and demo sequence.

## Challenge evidence

- [Agent task and authority contract](AGENT_CONTRACT.md)
- [Public agent API contract](API.md)
- [Asset provenance](ASSET_PROVENANCE.md)
- [Release and accessibility checklist](RELEASE_CHECKLIST.md)
- [Raintree standards application](STANDARDS.md)
- [Challenge data and privacy](PRIVACY.md)
- [Public Terms of Use](https://webmcp.flightsweeper.com/terms)
- [Public Privacy Policy](https://webmcp.flightsweeper.com/privacy)
- [Legal scope and review record](LEGAL_REVIEW.md)
- [Security policy](SECURITY.md)

The accessibility target for the challenge is WCAG 2.2 Level AA in current ChatGPT desktop and Chrome 149+, with keyboard, screen-reader semantics, 200% zoom, mobile reflow, visible focus, and reduced-motion behavior included in the release checklist. See the checklist for the verified and still-manual acceptance gates.

## Raintree open-source relationship

This MIT-licensed challenge repository is published by Raintree Technology as a self-contained FlightSweeper demonstration. Private production FlightSweeper code and services are not included. It applies a relevant subset of Raintree's historical standards archive as a review reference; [STANDARDS.md](STANDARDS.md) records evidence, exceptions, and non-claims.

## Contributing, security, and license

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change and [SECURITY.md](SECURITY.md) for private reporting guidance.

[MIT](LICENSE)
