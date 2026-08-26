# FlightSweeper WebMCP Challenge Edition

- Work only on `main`.
- Keep this repository self-contained and safe to publish.
- Never copy credentials, production data, private provider code, or customer information from FlightSweeper.
- Sandbox purchases must never create a real charge or supplier order.
- Keep raw passenger identity and payment details outside WebMCP tool inputs and outputs.
- Consequential tools must enforce policy and idempotency on the application side; never trust model-supplied prices or authorization claims.
- Run `npm test` before handoff.
