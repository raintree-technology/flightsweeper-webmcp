# Challenge release checklist

## Release boundary

This is a public sandbox with a static browser application and small MCP API endpoints. The failure boundary is limited to synthetic challenge state stored in the visitor’s browser and bounded public MCP requests. It has no production FlightSweeper connection, supplier credentials, customer data, payment rail, or ability to create a real airline order. Recovery is a Git revert and Vercel redeployment; browser state can be removed with **Erase challenge data**.

## Automated gates

- [x] Unit and contract tests pass with `npm test`.
- [x] Policy authorization, denial, expiration, revocation, tightening, evidence invalidation, quote freshness, human confirmation, and repeat safety are covered.
- [x] Adversarial supplier content cannot alter policy inputs.
- [x] WebMCP schemas are bounded and state exposure is contract-tested.
- [x] Secret scan reports no credentials or private data.
- [x] Deployment configuration requires HTTPS transport security, CSP, a least-capability Permissions Policy, `Referrer-Policy`, and `X-Content-Type-Options`.
- [x] Public privacy, security, contributor, provenance, and standards-boundary documents are present and contract-tested.
- [x] Public challenge Terms and Privacy pages are linked, sandbox-scoped, and identify FinSync LLC and the California seller-of-travel disclosure.
- [x] Operator supplied California DOJ documents confirming FinSync LLC, CST 2172984-70, valid July 15, 2026 through July 14, 2027; private certificate images are excluded from the public repository.
- [x] Operator supplied California entity details confirming the March 27, 2025 formation date and the ZenBusiness registered-agent address used on the legal pages.
- [x] Operator approved publication as challenge-only policies and accepted the unresolved, non-production limits recorded in `LEGAL_REVIEW.md`.

## Manual accessibility target — WCAG 2.2 AA

- [x] Complete the mission-to-ticket flow with keyboard only and inspect focus order.
- [ ] Inspect names, roles, states, relationships, errors, and live regions with a screen reader.
- [x] Verify contrast and focus appearance.
- [x] Verify 200% zoom and reflow at 320 CSS pixels without lost actions or meaning.
- [x] Verify reduced-motion behavior.

## Browser and transaction gates

- [x] Discover and invoke every valid tool state in the ChatGPT desktop in-app browser (26.820.80927) against the public HTTPS deployment.
- [x] Repeat native discovery and invocation in Chromium 151 (newer than the Chrome 149 minimum) with native WebMCP enabled.
- [x] Exercise eligible purchase, non-refundable denial, over-limit denial, revocation, and human-confirmation states in the browser; cover stale-quote rejection in the automated policy suite.
- [x] Confirm a duplicate key and a different post-ticket retry key return the original ticket.
- [x] Confirm reload persistence, reset preservation, new-mission preservation, and complete local-data erasure.
- [x] Inspect desktop and mobile layouts and confirm no unexpected console or network errors.
- [x] Recheck the deployed browser application for same-origin-only behavior and the documented `flightsweeper.webmcp.challenge.v1` browser-storage key.

## Submission gates

- [x] Publish a 2:23 public demonstration with audio: https://youtu.be/pBOZ6nnwNKs
- [x] Publish final screenshots, video, live URL, and repository URL on Devpost: https://devpost.com/software/flightsweeper
- [x] Submit the project on August 28, 2026, before the September 3 at 1:00 p.m. PT deadline.

Do not describe unchecked manual gates as verified. The accountable submitter owns the final native-browser and accessibility acceptance run.

The checked browser and transaction gates were repeated against the public deployment where noted. The browser application uses the documented storage key and contains no outbound data client; its network authority remains constrained to same-origin endpoints by the deployed content security policy.

The local candidate exposes expected headings, landmarks, control names, states, descriptions, validation focus, and live regions through macOS accessibility APIs. On August 28, 2026, VoiceOver was enabled for a structural navigation pass against the public app and then returned to its prior off state. The environment could inspect VoiceOver-exposed structure but could not hear synthesized speech, so a short human listening confirmation remains required before checking the screen-reader gate.

On August 28, 2026, ChatGPT desktop in-app browser 26.820.80927 discovered and invoked all ten tools against the public deployment. The run covered an expired stored mandate, fresh mission creation, search and comparison, adversarial non-refundable denial, monotonic tightening to nonstop, quote refresh, authorization, sandbox ticketing, idempotent replay, revocation, and receipt retrieval after revocation. The final page exposed only the three valid ticketed-and-revoked tools and reported no browser console warnings or errors.
