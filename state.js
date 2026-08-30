import { createIdempotencyStore, createMission } from "./engine.js";

export const STORAGE_KEY = "flightsweeper.webmcp.challenge.v1";

const missionStatuses = new Set(["ready", "offers_ready", "offer_selected", "quote_refreshed", "authorized", "denied", "ticketed", "authority_revoked"]);
const ruleNames = new Set(["route", "date", "arrival", "cabin", "stops", "refundability", "price", "authority"]);

function boundedString(value, maximum = 500) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function validDateTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isStoredOffer(offer) {
  return offer && boundedString(offer.id, 80) && /^[A-Z]{3}$/.test(offer.origin) && /^[A-Z]{3}$/.test(offer.destination)
    && boundedString(offer.airline, 80) && boundedString(offer.flight, 20) && validDateTime(offer.departure) && validDateTime(offer.arrival)
    && Number.isInteger(offer.totalCents) && offer.totalCents >= 0 && offer.totalCents <= 500000 && offer.currency === "USD"
    && [0, 1, 2].includes(offer.stops) && ["economy", "premium_economy"].includes(offer.cabin)
    && typeof offer.refundable === "boolean" && Number.isInteger(offer.durationMinutes) && offer.durationMinutes > 0 && offer.durationMinutes <= 1440
    && (offer.supplierContent === undefined || boundedString(offer.supplierContent, 500));
}

function isDecisionRecord(record) {
  return record && ["authorized", "denied"].includes(record.decision) && boundedString(record.offerId, 80)
    && Number.isInteger(record.policyVersion) && record.policyVersion >= 1 && Number.isInteger(record.quoteVersion) && record.quoteVersion >= 0
    && Number.isInteger(record.totalCents) && record.totalCents >= 0 && record.totalCents <= 500000 && record.currency === "USD"
    && Array.isArray(record.failedRules) && record.failedRules.every((rule) => ruleNames.has(rule));
}

function isDecisionReceipt(receipt) {
  return receipt && ["authorized", "denied"].includes(receipt.decision) && boundedString(receipt.offerId, 80)
    && Number.isInteger(receipt.policyVersion) && receipt.policyVersion >= 1 && Number.isInteger(receipt.quoteVersion) && receipt.quoteVersion >= 0
    && Array.isArray(receipt.failedRules) && receipt.failedRules.every((rule) => ruleNames.has(rule))
    && boundedString(receipt.id, 120) && boundedString(receipt.missionId, 120)
    && ["authorization", "denial"].includes(receipt.type) && boundedString(receipt.actor, 40) && validDateTime(receipt.createdAt)
    && receipt.evidence?.price?.offered && Number.isInteger(receipt.evidence.price.offered.cents) && receipt.evidence.price.offered.currency === "USD";
}

function isBooking(booking) {
  return booking && boundedString(booking.id, 120) && booking.status === "ticketed" && boundedString(booking.offerId, 80)
    && Number.isInteger(booking.totalCents) && booking.totalCents >= 0 && booking.totalCents <= 500000 && booking.currency === "USD"
    && /^999-[0-9]{10}$/.test(booking.ticketNumber) && booking.supplierReference === "WEBMCP" && booking.sandbox === true
    && isDecisionReceipt(booking.authorizationReceipt) && validDateTime(booking.createdAt);
}

function hasCoherentLifecycle(mission) {
  const selected = mission.selectedOfferId === null ? null : mission.offers.find((offer) => offer.id === mission.selectedOfferId);
  if (["ready", "offers_ready"].includes(mission.status) && mission.selectedOfferId !== null) return false;
  if (["offer_selected", "quote_refreshed", "authorized", "denied"].includes(mission.status) && !selected) return false;
  if (["quote_refreshed", "authorized", "denied", "ticketed"].includes(mission.status) && mission.quoteVersion < 1) return false;
  if (["authorized", "denied"].includes(mission.status)) {
    if (!isDecisionRecord(mission.evaluatedDecision) || !isDecisionReceipt(mission.decisionReceipt)) return false;
    if (mission.evaluatedDecision.decision !== mission.status || mission.decisionReceipt.decision !== mission.status) return false;
    if (mission.evaluatedDecision.offerId !== mission.selectedOfferId || mission.decisionReceipt.offerId !== mission.selectedOfferId) return false;
    if (mission.evaluatedDecision.policyVersion !== mission.policyVersion || mission.decisionReceipt.policyVersion !== mission.policyVersion) return false;
    if (mission.evaluatedDecision.quoteVersion !== mission.quoteVersion || mission.decisionReceipt.quoteVersion !== mission.quoteVersion) return false;
  }
  if (mission.status === "ticketed" && (!isBooking(mission.booking) || mission.booking.offerId !== mission.selectedOfferId)) return false;
  if (mission.status === "authority_revoked" && (mission.authority !== "revoked" || mission.booking)) return false;
  return true;
}

function isStoredMission(mission) {
  return mission && typeof mission.id === "string" && missionStatuses.has(mission.status)
    && /^[A-Z]{3}$/.test(mission.origin) && /^[A-Z]{3}$/.test(mission.destination) && mission.origin !== mission.destination
    && validDate(mission.departureDate) && /^([01]\d|2[0-3]):[0-5]\d$/.test(mission.arriveBefore)
    && Array.isArray(mission.permittedCabins) && mission.permittedCabins.length > 0 && mission.permittedCabins.length <= 2
    && new Set(mission.permittedCabins).size === mission.permittedCabins.length
    && mission.permittedCabins.every((cabin) => ["economy", "premium_economy"].includes(cabin))
    && [0, 1, 2].includes(mission.maxStops) && Number.isInteger(mission.maxTotalCents)
    && mission.maxTotalCents >= 10000 && mission.maxTotalCents <= 500000 && mission.currency === "USD"
    && ["autonomous", "confirm_before_purchase"].includes(mission.confirmationMode)
    && ["active", "revoked"].includes(mission.authority) && validDateTime(mission.expiresAt)
    && Number.isInteger(mission.policyVersion) && mission.policyVersion >= 1
    && Number.isInteger(mission.quoteVersion) && mission.quoteVersion >= 0 && Array.isArray(mission.offers) && mission.offers.length <= 20 && mission.offers.every(isStoredOffer)
    && mission.purchasesByKey && typeof mission.purchasesByKey === "object" && !Array.isArray(mission.purchasesByKey)
    && Object.entries(mission.purchasesByKey).length <= 100
    && Object.entries(mission.purchasesByKey).every(([key, booking]) => /^[A-Za-z0-9][A-Za-z0-9.:-]{0,79}$/.test(key) && isBooking(booking))
    && (mission.evaluatedDecision === null || isDecisionRecord(mission.evaluatedDecision))
    && (mission.decisionReceipt === null || isDecisionReceipt(mission.decisionReceipt))
    && (mission.booking === null || isBooking(mission.booking)) && hasCoherentLifecycle(mission);
}

function isActivityEntry(entry) {
  return entry && boundedString(entry.id, 120) && boundedString(entry.actor, 40) && boundedString(entry.title, 160)
    && boundedString(entry.detail, 1000) && validDateTime(entry.createdAt);
}

function isStoredReceipt(receipt) {
  return receipt?.type === "booking" ? isBooking(receipt) && boundedString(receipt.missionId, 120) : isDecisionReceipt(receipt);
}

export function createAppState() {
  const mission = createMission();
  return {
    version: 1,
    mission,
    activity: [{ id: `activity_${Date.now()}`, actor: "human", title: "Mission created", detail: "The traveler created a bounded sandbox purchase mandate.", createdAt: new Date().toISOString() }],
    receipts: [],
  };
}

export function parseStoredState(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.version !== 1 || !isStoredMission(parsed.mission)
      || !Array.isArray(parsed.activity) || parsed.activity.length > 200 || !parsed.activity.every(isActivityEntry)
      || !Array.isArray(parsed.receipts) || parsed.receipts.length > 200 || !parsed.receipts.every(isStoredReceipt)) return null;
    parsed.mission.purchasesByKey = createIdempotencyStore(parsed.mission.purchasesByKey);
    return parsed;
  } catch {
    return null;
  }
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function replaceCurrentMission(state, mission = createMission()) {
  state.mission = mission;
  state.activity = [{ id: `activity_${Date.now()}`, actor: "human", title: "New mission created", detail: "Previous receipts remain available below.", createdAt: new Date().toISOString() }];
  return state;
}
