# Challenge legal document map

Status: public challenge policy; not attorney-reviewed and not suitable for production travel sales  
Operational owner: FinSync LLC / Raintree Technology  
Legal contact: legal@raintree.technology  
Initial effective date: August 26, 2026  
Next review trigger: whenever the product, hosting provider, data flow, audience, jurisdiction, legal entity, or CST registration changes

## Scope decision

These documents govern only the free, public FlightSweeper WebMCP Challenge Edition. The site has no accounts, analytics, advertising, application server, live supplier, passenger data, payment collection, real reservation, or ticketing capability. It is intended for adult judges, developers, and browser-tool evaluators. English and United States use are the supported legal scope.

Private and production FlightSweeper services are excluded. Any real booking, payment, account, customer-content, support, marketing, or enterprise processing requires its own approved terms, privacy notice, sale disclosures, acceptance evidence, and—where applicable—DPA, subprocessor, cookie, refund, and seller-of-travel documents.

## Document set and precedence

| Document | Version | Function | Relationship |
| --- | --- | --- | --- |
| `terms.html` | `terms-2026-08-26.1` | Conditions for use of the public sandbox | Links to the Privacy Policy as a notice; open-source licenses separately govern source and third-party assets |
| `privacy.html` | `privacy-2026-08-26.1` | Notice of challenge, hosting, local-storage, and contact processing | Notice only; it is not consent and does not form part of the Terms unless governing law requires otherwise |
| `LICENSE` | repository version | MIT copyright license for covered source | Does not grant trademark rights; third-party assets retain stated licenses |
| `PRIVACY.md` | maintainer summary | Technical processing boundary | The rendered `privacy.html` is the controlling public challenge notice |

## Evidence and sources

- Application behavior: `app.js`, `state.js`, `engine.js`, `tool-contracts.js`, and tests.
- Hosting and browser controls: `vercel.json` and deployed-header verification.
- Asset and license boundary: `ASSET_PROVENANCE.md` and `LICENSE`.
- Entity and contact facts: existing FlightSweeper public legal constants maintained by FinSync LLC.
- California seller-of-travel wording: California Attorney General Seller of Travel guidance and Business and Professions Code section 17550.24.
- Structural references: Harvey Platform Agreement and Privacy Policy, OpenAI Terms of Use, and Vercel Terms and Privacy Notice. Their language and data classifications were not copied.

## Operator confirmations and unresolved limits

- FinSync LLC’s California entity status was cross-checked against a current registry-derived record. The DBA wording, address, phone, email, and CST number remain operator-supplied facts and must be kept current by FinSync LLC.
- The public California web search did not expose an authoritative searchable record for CST 2172984-70. The number must be checked against FinSync LLC’s current registration certificate at each renewal.
- The $100 liability cap, California governing-law/forum clause, warranty disclaimer, age threshold, acceptable-use remedies, and feedback license have not been approved by counsel.
- The interaction-point notice is the challenge’s formation method. The site does not maintain a durable, server-side record of individual assent; Git preserves publication versions only.
- Determine whether CCPA, CalOPPA, GDPR/UK GDPR, ePrivacy, COPPA, or other regional rules apply to the actual audience and deployment, and whether the described rights process is operationally supportable.
- Confirm Vercel log categories, access, retention, subprocessors, international transfers, and any project-level analytics, drains, firewall, or observability settings not visible in source.
- Decide whether a cookie/storage consent mechanism is required for browser local storage in any supported jurisdiction. The current local storage is essential to the requested interactive state and is not used for tracking.

## Change control

Do not silently replace a published legal page. For each revision:

1. assign a new immutable version;
2. preserve the prior Git revision and record a plain-language change summary;
3. classify material changes before publication;
4. update the visible effective date and interaction-point notice when required;
5. rerun legal-page, storage, network, contact, accessibility, and route checks; and
6. record the operator approval appropriate to the change and obtain qualified review if the scope expands beyond the static challenge sandbox.
