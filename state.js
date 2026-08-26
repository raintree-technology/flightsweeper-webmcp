import { createMission } from "./engine.js";

export const STORAGE_KEY = "flightsweeper.webmcp.challenge.v1";

const missionStatuses = new Set(["ready", "offers_ready", "offer_selected", "quote_refreshed", "authorized", "denied", "ticketed", "authority_revoked"]);

function isStoredOffer(offer) {
  return offer && typeof offer.id === "string" && typeof offer.origin === "string" && typeof offer.destination === "string"
    && typeof offer.departure === "string" && typeof offer.arrival === "string" && Number.isInteger(offer.totalCents)
    && typeof offer.currency === "string" && Number.isInteger(offer.stops) && typeof offer.refundable === "boolean";
}

function isStoredMission(mission) {
  return mission && typeof mission.id === "string" && missionStatuses.has(mission.status)
    && /^[A-Z]{3}$/.test(mission.origin) && /^[A-Z]{3}$/.test(mission.destination) && mission.origin !== mission.destination
    && /^\d{4}-\d{2}-\d{2}$/.test(mission.departureDate) && /^([01]\d|2[0-3]):[0-5]\d$/.test(mission.arriveBefore)
    && Array.isArray(mission.permittedCabins) && mission.permittedCabins.length > 0
    && mission.permittedCabins.every((cabin) => ["economy", "premium_economy"].includes(cabin))
    && [0, 1, 2].includes(mission.maxStops) && Number.isInteger(mission.maxTotalCents)
    && mission.maxTotalCents >= 10000 && mission.maxTotalCents <= 500000 && mission.currency === "USD"
    && ["autonomous", "confirm_before_purchase"].includes(mission.confirmationMode)
    && ["active", "revoked"].includes(mission.authority) && Number.isInteger(mission.policyVersion)
    && Number.isInteger(mission.quoteVersion) && Array.isArray(mission.offers) && mission.offers.every(isStoredOffer)
    && mission.purchasesByKey && typeof mission.purchasesByKey === "object" && !Array.isArray(mission.purchasesByKey);
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
    if (parsed?.version !== 1 || !isStoredMission(parsed.mission) || !Array.isArray(parsed.activity) || !Array.isArray(parsed.receipts)) return null;
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
