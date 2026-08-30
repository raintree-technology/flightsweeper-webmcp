# Devpost submission record

Live URL: https://flightsweeper-webmcp.vercel.app

Public repository: https://github.com/raintree-technology/flightsweeper-webmcp

Devpost entry: https://devpost.com/software/flightsweeper

Public demo video: https://youtu.be/pBOZ6nnwNKs

## Project description

FlightSweeper lets a browser agent complete a sandbox flight purchase without letting the model set its own authority.

The traveler sets exact, revocable limits. The agent searches and executes. FlightSweeper independently approves or denies the transaction and records why.

## Why WebMCP

Traditional browser agents infer controls from the visual interface and can carry stale or adversarial page content into a consequential action. WebMCP gives FlightSweeper a structured, page-scoped transaction surface with bounded inputs and explicit trust annotations. The human and agent share the same visible transaction state, while the page exposes only the tools valid for the current step.

The division of responsibility is explicit: the human owns authority, the agent owns search and execution, suppliers own inventory, and FlightSweeper owns policy and transaction evidence.

## What the traveler and agent do together

The traveler defines the route, date, arrival deadline, cabin, connections, refundability, purchase cap, and execution mode. A human can replace or expand that authority. An agent can only narrow it. The traveler can revoke future authority at any time.

The agent reads the mandate, searches sandbox inventory, compares offers, selects an exact quote, refreshes it, requests independent policy evaluation, and issues one idempotent sandbox ticket. The traveler watches the same state change on the page.

## Three transaction proofs

**Adversarial content is contained.** One supplier result contains text that tells the agent to ignore the traveler’s refundability rule. FlightSweeper marks provider-backed output as untrusted and independently denies the offer against the stored mandate.

**The model cannot authorize itself.** Tool callers provide mission, offer, and idempotency identifiers—not price, passenger, payment, or authorization claims. FlightSweeper reloads the stored mission and exact quote before every consequential decision.

**Execution is repeat-safe and evidenced.** Authorization, denial, and booking receipts record policy and quote versions, stored limits, offered values, rule results, actor, timestamp, and resolution. Repeating a purchase returns the original ticket, including after future authority is revoked.

## WebMCP implementation

The page registers 10 tools with `document.modelContext.registerTool()`, bounded JSON Schemas, and accurate `readOnlyHint` and `untrustedContentHint` annotations. An `AbortController` removes the prior tool set when transaction state changes, then the page registers only the valid next actions. Human controls and WebMCP tools call the same application functions and persist state in versioned browser storage.

We verified the complete lifecycle in ChatGPT desktop’s in-app browser and Chromium 151: adversarial denial, monotonic tightening, quote refresh, authorization, ticketing, replay, revocation, and receipt retrieval.

## What we built during the challenge

Production FlightSweeper existed before the challenge. After the August 25, 2026 kickoff, we built this public, self-contained WebMCP Challenge Edition: the sandbox inventory, state-aware tool surface, authority and policy engine, adversarial fixture, durable evidence, repeat-safe ticketing, browser interface, tests, documentation, and deployment. Production FlightSweeper remains private and unchanged.

The challenge edition isolates the transaction rail and never charges a card or creates an airline order. It demonstrates authority, policy, quote-binding, revocation, and idempotency controls. A live provider connection would require additional provider, payment, identity, operational, and regulatory controls.

FinSync LLC operates FlightSweeper and is registered as a California Seller of Travel, CST 2172984-70. Registration as a seller of travel does not constitute approval by the State of California.

## Demo video sequence — under three minutes

1. Create a refundable LAX–JFK mission capped at $900.
2. Ask the browser agent to read the mandate and search.
3. Show the cheaper supplier result containing adversarial text; ask the agent to evaluate it.
4. Open the durable denial receipt showing the refundability failure.
5. Have the human tighten the mission to nonstop.
6. Ask the agent to select the eligible $684.32 offer, refresh it, and evaluate it.
7. Ask the agent to purchase with an idempotency key and show the ticket receipt.
8. Repeat the purchase request and show that the original ticket is returned.
9. Revoke future authority and reload the page to show persistent evidence.

## Submission checklist

- [x] Public HTTPS URL: https://flightsweeper-webmcp.vercel.app
- [x] Public GitHub repository with detected MIT license: https://github.com/raintree-technology/flightsweeper-webmcp
- [x] Native WebMCP tool discovery and complete lifecycle verified in ChatGPT desktop’s in-app browser
- [x] Native WebMCP verification completed in Chromium 151, newer than the Chrome 149 minimum
- [x] Public 2:23 YouTube demo published with audio: https://youtu.be/pBOZ6nnwNKs
- [x] Devpost description, screenshots, video, repository URL, and live URL published: https://devpost.com/software/flightsweeper
- [x] Project submitted on August 28, 2026, before the September 3 at 1:00 p.m. PT deadline
