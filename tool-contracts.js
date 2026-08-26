export const toolContracts = Object.freeze([
  {
    name: "read_flight_mission",
    description: "Read the active flight mission, its exact purchasing limits, current state, and safe booking status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  {
    name: "search_flights",
    description: "Search the challenge flight inventory using the active mission. The caller cannot expand the stored route or spending authority.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: false,
    untrustedContentHint: true,
  },
  {
    name: "tighten_flight_mission",
    description: "Make the active mission safer or narrower. The agent may lower the price cap, require an earlier arrival, reduce connections, or require refundability, but can never expand its authority.",
    inputSchema: {
      type: "object",
      properties: {
        maxTotalCents: { type: "integer", minimum: 0, maximum: 500000 },
        maxStops: { type: "integer", minimum: 0, maximum: 2 },
        arriveBefore: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
        refundableOnly: { type: "boolean" },
      },
      additionalProperties: false,
    },
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  {
    name: "compare_visible_offers",
    description: "Compare offers already visible in Mission Control and return application-side policy decisions for each.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    untrustedContentHint: true,
  },
  {
    name: "select_offer",
    description: "Select one currently visible offer for purchase evaluation. This does not charge or book.",
    inputSchema: { type: "object", properties: { offerId: { type: "string", minLength: 1, maxLength: 80, pattern: "^[A-Za-z0-9_-]+$" } }, required: ["offerId"], additionalProperties: false },
    readOnlyHint: false,
    untrustedContentHint: true,
  },
  {
    name: "refresh_selected_offer",
    description: "Refresh the selected offer before purchase and advance its application-controlled quote version.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: false,
    untrustedContentHint: true,
  },
  {
    name: "evaluate_purchase",
    description: "Evaluate the selected offer against the stored route, fare, price, and authority policy. The agent cannot provide its own authorization decision.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  {
    name: "purchase_selected_offer",
    description: "Issue one sandbox ticket for the selected, refreshed, authorized offer, or return the original ticket when the mission is already booked. Requires an idempotency key. Never creates a real charge or airline order.",
    inputSchema: {
      type: "object",
      properties: { idempotencyKey: { type: "string", minLength: 1, maxLength: 80 } },
      required: ["idempotencyKey"],
      additionalProperties: false,
    },
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  {
    name: "get_booking_receipt",
    description: "Read the canonical sandbox booking receipt without passenger or payment data.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  {
    name: "revoke_purchase_authority",
    description: "Revoke the active mission authority so future purchase attempts are denied.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnlyHint: false,
    untrustedContentHint: false,
  },
]);

export function activeToolNames(mission) {
  const names = new Set(["read_flight_mission"]);
  if (mission.authority === "active") {
    names.add("revoke_purchase_authority");
    if (!mission.booking) names.add("tighten_flight_mission");
  }
  if (mission.status === "ready") names.add("search_flights");
  if (["offers_ready", "offer_selected", "quote_refreshed", "authorized", "denied"].includes(mission.status)) {
    names.add("search_flights");
    names.add("compare_visible_offers");
    names.add("select_offer");
  }
  if (["offer_selected", "quote_refreshed", "authorized", "denied"].includes(mission.status)) {
    names.add("refresh_selected_offer");
    names.add("evaluate_purchase");
  }
  if (mission.status === "authorized" && mission.confirmationMode === "autonomous") names.add("purchase_selected_offer");
  if (mission.booking) {
    names.add("get_booking_receipt");
    names.add("purchase_selected_offer");
  }
  return [...names];
}
