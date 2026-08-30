import test from "node:test";
import assert from "node:assert/strict";
import { displayOfferLocalTime } from "./time.js";

test("offer times retain their declared airport-local clock value", () => {
  assert.equal(displayOfferLocalTime("2026-09-13T09:10:00-07:00"), "9:10 AM");
  assert.equal(displayOfferLocalTime("2026-09-13T17:32:00-04:00"), "5:32 PM");
});

test("invalid offer timestamps fail closed", () => {
  assert.throws(() => displayOfferLocalTime("not-a-time"), /must include/);
});
