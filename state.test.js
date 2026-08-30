import test from "node:test";
import assert from "node:assert/strict";
import { createDecisionReceipt, evaluateOffer, searchOffers } from "./engine.js";
import { createAppState, parseStoredState, replaceCurrentMission, serializeState } from "./state.js";

test("challenge state survives serialization", () => {
  const state = createAppState();
  state.mission.offers = searchOffers(state.mission);
  state.mission.selectedOfferId = state.mission.offers[0].id;
  state.mission.quoteVersion = 1;
  const evaluation = evaluateOffer(state.mission, state.mission.offers[0]);
  const receipt = createDecisionReceipt(state.mission, state.mission.offers[0], evaluation);
  state.mission.evaluatedDecision = evaluation;
  state.mission.decisionReceipt = receipt;
  state.mission.status = "authorized";
  state.receipts.push(receipt);
  assert.deepEqual(parseStoredState(serializeState(state)), state);
});

test("new missions preserve durable receipts", () => {
  const state = createAppState();
  state.receipts.push({ id: "receipt_1" });
  const previousId = state.mission.id;
  replaceCurrentMission(state);
  assert.notEqual(state.mission.id, previousId);
  assert.equal(state.receipts.length, 1);
});

test("invalid storage is ignored", () => {
  assert.equal(parseStoredState("not-json"), null);
  assert.equal(parseStoredState('{"version":2}'), null);
});

test("malformed versioned storage fails closed", () => {
  const state = createAppState();
  state.mission.maxTotalCents = "unbounded";
  assert.equal(parseStoredState(JSON.stringify(state)), null);

  const invalidOffer = createAppState();
  invalidOffer.mission.offers = [{ id: "offer_without_policy_fields" }];
  assert.equal(parseStoredState(JSON.stringify(invalidOffer)), null);

  const incoherentAuthorization = createAppState();
  incoherentAuthorization.mission.status = "authorized";
  assert.equal(parseStoredState(JSON.stringify(incoherentAuthorization)), null);

  const impossibleDate = createAppState();
  impossibleDate.mission.departureDate = "2026-02-31";
  assert.equal(parseStoredState(JSON.stringify(impossibleDate)), null);
});
