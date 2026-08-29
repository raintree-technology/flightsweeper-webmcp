# Devpost submission record

Live URL: https://flightsweeper-webmcp.vercel.app

Public repository: https://github.com/raintree-technology/flightsweeper-webmcp

Devpost entry: https://devpost.com/software/flightsweeper

Public demo video: https://youtu.be/pBOZ6nnwNKs

## Project description

FlightSweeper Mission Control demonstrates how a person can give a browser agent exact, revocable authority to purchase a flight without trusting the model to enforce financial policy.

The traveler defines the route, date, arrival deadline, cabin, connections, refundability, purchase cap, and execution mode. WebMCP exposes only the tools valid for the current transaction state. The agent searches sandbox inventory, compares offers, selects an exact quote, refreshes it, requests independent policy evaluation, and issues one idempotent sandbox ticket. The traveler watches the same state, can tighten the mission, and can revoke authority at any time.

Supplier results are treated as untrusted. One result contains an instruction telling the agent to ignore the traveler’s mandate. FlightSweeper labels the provider output as untrusted and rejects the offer through application-side refundability and price checks. Authorization, denial, and booking receipts record the policy version, quote version, rule results, offered values, stored limits, actor, timestamp, and resolution. Receipts and idempotency state persist across reloads and new missions.

This challenge edition is a self-contained sandbox. It never charges a card or creates an airline order. FinSync LLC operates FlightSweeper and is registered as a California Seller of Travel, CST 2172984-70. Registration as a seller of travel does not constitute approval by the State of California.

## Why WebMCP

Traditional browser agents must infer controls from the visual interface and may carry stale or adversarial page content into a financial action. WebMCP lets FlightSweeper expose a small, structured, page-scoped transaction surface with explicit trust annotations. Tool registration changes with the mission lifecycle, while the human and agent continue working in the same visible interface.

The result is a clearer division of responsibility: the human owns authority, the agent owns search and execution, suppliers own inventory, and FlightSweeper owns policy and transaction evidence.

## What became possible

- A human can replace or expand a mission while an agent can only make it safer or narrower.
- The agent can complete an autonomous sandbox purchase without receiving price-setting, payment, or passenger authority.
- Adversarial supplier content cannot override application policy.
- Every consequential decision is visible, durable, and attributable.
- Duplicate requests return the original ticket instead of creating another purchase.

## WebMCP implementation

The page calls `document.modelContext.registerTool()` with bounded JSON Schemas and `readOnlyHint` and `untrustedContentHint` annotations. An `AbortController` removes the prior tool set whenever transaction state changes, then the page registers only the tools valid for the new state. Registration replacement waits for an active tool call to return so a state mutation cannot cancel its own result. Tool callbacks and human controls call the same application functions and persist the resulting state in versioned browser storage.

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
