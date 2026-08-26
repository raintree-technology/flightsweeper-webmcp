# Challenge release checklist

## Release boundary

This is a static, public, dependency-free sandbox. The failure boundary is limited to challenge state stored in the visitor’s browser. It has no production FlightSweeper connection, supplier credentials, customer data, payment rail, or ability to create a real airline order. Recovery is a Git revert and Vercel redeployment; browser state can be removed with **Erase challenge data**.

## Automated gates

- [x] Unit and contract tests pass with `npm test`.
- [x] Policy authorization, denial, expiration, revocation, tightening, evidence invalidation, quote freshness, human confirmation, and repeat safety are covered.
- [x] Adversarial supplier content cannot alter policy inputs.
- [x] WebMCP schemas are bounded and state exposure is contract-tested.
- [x] Secret scan reports no credentials or private data.
- [x] Deployment configuration requires HTTPS transport security, CSP, a least-capability Permissions Policy, `Referrer-Policy`, and `X-Content-Type-Options`.
- [x] Public privacy, security, contributor, provenance, and standards-boundary documents are present and contract-tested.
- [x] Public challenge Terms and Privacy pages are linked, sandbox-scoped, and identify FinSync LLC and the California seller-of-travel disclosure.
- [ ] Qualified legal owner approves the scope, operator facts, formation method, liability/forum terms, privacy applicability, Vercel processing facts, and rights process recorded in `LEGAL_REVIEW.md`.

## Manual accessibility target — WCAG 2.2 AA

- [x] Complete the mission-to-ticket flow with keyboard only and inspect focus order.
- [ ] Inspect names, roles, states, relationships, errors, and live regions with a screen reader.
- [x] Verify contrast and focus appearance.
- [x] Verify 200% zoom and reflow at 320 CSS pixels without lost actions or meaning.
- [x] Verify reduced-motion behavior.

## Browser and transaction gates

- [ ] Discover and invoke every valid tool state in the latest ChatGPT desktop browser.
- [x] Repeat native discovery and invocation in Chromium 151 (newer than the Chrome 149 minimum) with native WebMCP enabled.
- [x] Exercise eligible purchase, non-refundable denial, over-limit denial, revocation, and human-confirmation states in the browser; cover stale-quote rejection in the automated policy suite.
- [x] Confirm a duplicate key and a different post-ticket retry key return the original ticket.
- [x] Confirm reload persistence, reset preservation, new-mission preservation, and complete local-data erasure.
- [x] Inspect desktop and mobile layouts and confirm no unexpected console or network errors.
- [ ] Recheck the deployed URL for same-origin-only application requests and the documented browser-storage key.

## Submission gates

- [ ] Record a public demonstration under three minutes with audio.
- [ ] Add final screenshots, video, live URL, and repository URL to Devpost.
- [ ] Treat September 3 at 1:00 p.m. PT as the hard deadline.

Do not describe unchecked manual gates as verified. The accountable submitter owns the final native-browser and accessibility acceptance run.

The checked browser and transaction gates apply to the local release candidate. Repeat them against the public URL after the candidate is deployed.

The local candidate exposes expected headings, landmarks, control names, states, descriptions, validation focus, and live regions through macOS accessibility APIs. A listening/navigation pass with VoiceOver remains required before checking the screen-reader gate. The installed Codex in-app browser (26.818.32112) currently reports `document.modelContext` unavailable on both localhost and the public HTTPS URL, so ChatGPT-native discovery remains blocked on a compatible app runtime.
