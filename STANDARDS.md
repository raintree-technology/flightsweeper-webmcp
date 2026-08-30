# Raintree standards application

This repository applies the Raintree standards library as a design and review reference. This file records the profiles and rules that apply to the public WebMCP sandbox. It also records evidence and known limits. It is not a certification claim.

## Active profiles

- **Public web page:** document identity, crawl controls, semantic HTML, keyboard access, resilient manual controls, browser security headers, and supported-browser verification.
- **UI feature:** complete mission states, familiar controls, visible status, specific confirmations, recoverable edits, and responsive reflow.
- **Agentic system:** a written task contract, minimum authority, untrusted-content isolation, application-side policy enforcement, repeat-safe execution, and durable evidence.
- **Functional writing:** named audiences, direct language, consistent terms, outcome-first structure, exact interface labels, and evidence-backed completion claims.

## Rule-to-evidence map

| Standard | How this repository applies it | Evidence |
| --- | --- | --- |
| `WEB-QUALITY-001`, `SEO-FOUNDATIONS-002`, `SEO-FOUNDATIONS-004`, `SEO-FOUNDATIONS-008` | The public document has one purpose, a language, descriptive title and description, canonical URL, robots policy, sitemap, and one primary heading. | `index.html`, `robots.txt`, `sitemap.xml`, contract tests |
| `WEB-QUALITY-002`–`005`, `FND-ACCESSIBILITY-001`–`006` | Native controls, landmarks, status regions, focus treatment, reduced motion, and reflow are release targets. | `index.html`, `styles.css`, `RELEASE_CHECKLIST.md` |
| `WEB-QUALITY-007`, `DESIGN-INTERACTION-001`–`007`, `CONTENT-INTERFACE-001`–`006` | The flow works without WebMCP. Controls name outcomes, status and next action stay visible, input errors preserve work, and consequential actions use specific confirmations. | `index.html`, `app.js`, browser acceptance gates |
| `WRITING-FUNCTIONAL-001`–`010`, `015`, `MARKETING-PROJECT-SHOWCASE-002`–`005`, `007`–`009` | The repository and submission copy name the audience, outcome, lifecycle, first action, expected evidence, and sandbox limit. Claims use consistent terms and distinguish verified behavior from production non-claims. | `README.md`, `SUBMISSION.md`, source checks, final rendered-review gate |
| `WEB-QUALITY-010`, `WEB-QUALITY-014`, `SECURITY-APPLICATION-001`, `005`, `008`, `010`, `017`–`019` | No privileged secret or real transaction exists in the client. Supplier text is untrusted and rendered as text. Exact purchase authority is re-evaluated from stored state. | `SECURITY.md`, `vercel.json`, `engine.js`, `app.js`, tests |
| `PRIVACY-DATA-001`, `003`, `005`, `008`, `014`, `015` | The data map is explicit, storage is local-only, passenger and payment data are excluded, and complete local deletion is available. | `PRIVACY.md`, `state.js`, `app.js`, browser acceptance gates |
| `FND-TRUST-001`, `002`, `005`, `006`, `008`, `009` | Sandbox consequences are disclosed. The human can edit, tighten, revoke, reset, or erase. Automated judgment and its boundary are visible. | UI copy, `AGENT_CONTRACT.md`, policy tests |
| `AI-AGENTS-002`, `003`, `005`–`007`, `009`–`011`, `017`, `018` | Tools are bounded. The agent cannot expand authority or supply financial truth. State controls execution validity and `validNextActions`. Adversarial content and attribution are tested. | `AGENT_CONTRACT.md`, `tool-contracts.js`, `engine.js`, tests |
| `API-CONTRACTS-001`–`007`, `009`, `010`, `013`, `016`–`023`, `025`, `027`, `031` | The public interfaces define operations, access, schemas, side effects, limits, cache behavior, lifecycle, errors, retry behavior, correlation, and compatibility. Browser mutations remain state-bound; the remote MCP is anonymous and read-only. | `API.md`, `agent-manifest.js`, `tool-contracts.js`, `api/`, contract and engine tests |
| `FND-CHANGE-001`–`005`, `AGENT-VERIFICATION-001`–`005`, `PRODUCT-DELIVERY-002`, `003`, `006` | The release boundary, recovery, stop conditions, non-goals, automated gates, manual gates, and residual uncertainty are written down. | `README.md`, `RELEASE_CHECKLIST.md`, `AGENT_CONTRACT.md` |
| `FND-EVIDENCE-001`, `003`–`005`, `ENGINEERING-QUALITY-003`, `006`–`008` | Automated, browser-observed, and still-manual evidence are distinct. Unchecked gates are not described as verified. | tests, `RELEASE_CHECKLIST.md`, `ASSET_PROVENANCE.md` |
| `LEGAL-PUBLISHED-TERMS-001`–`003`, `007`, `009`–`012`, `017` | The public legal set has an explicit scope, operator, versions, data-flow basis, interaction notice, change process, privacy-signal disclosure, and publication record. | `terms.html`, `privacy.html`, `LEGAL_REVIEW.md`, contract tests |

## Deliberate limits

- This build is not a real booking service, payment system, or production FlightSweeper release.
- It collects no passenger, payment, account, analytics, or live supplier data.
- WCAG 2.2 Level AA is the target, not a certification. Remaining checks are listed in `RELEASE_CHECKLIST.md`.
- The repository does not adopt the library's JavaScript toolchain prescription. The browser application has no runtime framework; the MCP endpoints use the repository's existing SDK and schema dependencies, and tests use the Node test runner.
- The showcase copy has author and system-evidence review. Representative human comprehension testing and independent documentation-accessibility approval remain unverified.
- The California seller-of-travel notice is included. No broader legal-compliance review is claimed.
- The Terms and Privacy Policy are public challenge policies, not attorney-reviewed production travel-sale documents. The site does not retain server-side evidence of individual assent.

## Change rule

When behavior or public claims change, update the relevant test and evidence document in the same change. Do not mark a manual gate complete without observing it in the release candidate.
