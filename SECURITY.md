# Security policy

## Supported surface

Security fixes apply to the current `main` branch and public challenge deployment. This is a static demonstration, not the private production FlightSweeper service.

## Report a vulnerability

Use GitHub's private vulnerability reporting for this repository. Do not include real passenger, payment, credential, or production-system data. If private reporting is unavailable, open an issue containing only a request for a private contact channel.

## Security boundary

- The app has no account system, server database, payment rail, supplier credential, or production API connection.
- It cannot charge a card or create an airline order.
- All offers are fixtures. Supplier content is untrusted, returned with `untrustedContentHint`, and rendered as text.
- The policy engine—not the agent—decides whether the stored offer satisfies the stored mandate.
- Tool callers cannot provide price, passenger, payment, policy version, quote version, or authorization claims.
- Purchase retries return the canonical sandbox booking instead of creating a second outcome.
- Browser storage contains only sandbox state. **Erase challenge data** removes that local record.

## Browser controls

The deployment sets HTTPS transport security, a restrictive Content Security Policy, `Permissions-Policy: tools=(self)` with camera, microphone, geolocation, and payment disabled, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`. The page loads no third-party scripts, fonts, analytics, or remote images.

## Out of scope

The synthetic adversarial supplier message and booking identifiers are intentional fixtures. Production FlightSweeper systems, real bookings, and third-party browser implementations are outside this repository's boundary and must not be tested through this app.
