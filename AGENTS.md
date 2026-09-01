# FlightSweeper WebMCP Challenge Edition

- Work only on `main`.
- Keep this repository self-contained and safe to publish.
- Never copy credentials, production data, private provider code, or customer information from FlightSweeper.
- Sandbox purchases must never create a real charge or supplier order.
- Keep raw passenger identity and payment details outside WebMCP tool inputs and outputs.
- Consequential tools must enforce policy and idempotency on the application side; never trust model-supplied prices or authorization claims.
- Read `STANDARDS.md` before changing behavior, public claims, tests, or release evidence. Apply the closest profiles from the public [Raintree Standards](https://github.com/raintree-technology/raintree.standards) catalog and report unresolved requirements by stable rule ID.
- Preserve the deliberate limits in `STANDARDS.md`. Do not describe this repository as certified or claim that an unchecked manual gate passed.
- Update the relevant test and evidence record in the same change when behavior or a public claim changes.
- Run `npm test` before handoff.
