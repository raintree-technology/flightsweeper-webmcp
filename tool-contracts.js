const closedObject = (properties, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
const ruleNames = ["route", "date", "arrival", "cabin", "stops", "refundability", "price", "authority"];
const ruleName = { type: "string", enum: ruleNames };
const checksSchema = closedObject(Object.fromEntries(ruleNames.map((name) => [name, { type: "boolean" }])));
const airportRoute = { type: "string", pattern: "^[A-Z]{3}-[A-Z]{3}$" };
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const clockTime = { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" };
const cabin = { type: "string", enum: ["economy", "premium_economy"] };
const moneyEvidence = closedObject({ cents: { type: "integer", minimum: 0, maximum: 500000 }, currency: { const: "USD" } });
const evidenceSchema = closedObject({
  route: closedObject({ stored: airportRoute, offered: airportRoute }),
  date: closedObject({ stored: date, offered: date }),
  arrival: closedObject({ stored: clockTime, offered: clockTime }),
  cabin: closedObject({ stored: { type: "array", items: cabin, minItems: 1, maxItems: 2, uniqueItems: true }, offered: cabin }),
  stops: closedObject({ stored: { type: "integer", minimum: 0, maximum: 2 }, offered: { type: "integer", minimum: 0, maximum: 2 } }),
  refundability: closedObject({ stored: { type: "boolean" }, offered: { type: "boolean" } }),
  price: closedObject({ stored: moneyEvidence, offered: moneyEvidence }),
  authority: closedObject({ stored: { type: "string", enum: ["active", "revoked"] }, offered: { type: "string", enum: ["unexpired", "expired"] } }),
});
const evaluationSchema = closedObject({
  decision: { type: "string", enum: ["authorized", "denied"] },
  checks: checksSchema,
  evidence: evidenceSchema,
  failedRules: { type: "array", items: ruleName, uniqueItems: true, maxItems: ruleNames.length },
  policyVersion: { type: "integer", minimum: 1 },
  quoteVersion: { type: "integer", minimum: 0 },
  offerId: { type: "string", minLength: 1, maxLength: 80 },
  totalCents: { type: "integer", minimum: 0, maximum: 500000 },
  currency: { const: "USD" },
});
const receiptSchema = closedObject({
  id: { type: "string", minLength: 1, maxLength: 120 },
  type: { type: "string", enum: ["authorization", "denial"] },
  decision: { type: "string", enum: ["authorized", "denied"] },
  missionId: { type: "string", minLength: 1, maxLength: 120 },
  offerId: { type: "string", minLength: 1, maxLength: 80 },
  policyVersion: { type: "integer", minimum: 1 },
  quoteVersion: { type: "integer", minimum: 0 },
  checks: checksSchema,
  evidence: evidenceSchema,
  failedRules: { type: "array", items: ruleName, uniqueItems: true, maxItems: ruleNames.length },
  actor: { type: "string", minLength: 1, maxLength: 40 },
  resolution: { type: "string", enum: ["purchase_allowed", "human_policy_change_required"] },
  createdAt: { type: "string", format: "date-time" },
});
const bookingSchema = closedObject({
  id: { type: "string", minLength: 1, maxLength: 120 },
  status: { const: "ticketed" },
  offerId: { type: "string", minLength: 1, maxLength: 80 },
  totalCents: { type: "integer", minimum: 0, maximum: 500000 },
  currency: { const: "USD" },
  ticketNumber: { type: "string", pattern: "^999-[0-9]{10}$" },
  supplierReference: { const: "WEBMCP" },
  sandbox: { const: true },
  authorizationReceipt: receiptSchema,
  createdAt: { type: "string", format: "date-time" },
});
const offerSchema = closedObject({
  origin: { type: "string", pattern: "^[A-Z]{3}$" },
  destination: { type: "string", pattern: "^[A-Z]{3}$" },
  currency: { const: "USD" },
  id: { type: "string", minLength: 1, maxLength: 80 },
  airline: { type: "string", minLength: 1, maxLength: 80 },
  flight: { type: "string", minLength: 1, maxLength: 20 },
  departure: { type: "string", minLength: 20, maxLength: 35 },
  arrival: { type: "string", minLength: 20, maxLength: 35 },
  stops: { type: "integer", minimum: 0, maximum: 2 },
  cabin: { type: "string", enum: ["economy", "premium_economy"] },
  refundable: { type: "boolean" },
  totalCents: { type: "integer", minimum: 0, maximum: 500000 },
  durationMinutes: { type: "integer", minimum: 1, maximum: 1440 },
  supplierContent: { type: "string", minLength: 1, maxLength: 500 },
}, ["origin", "destination", "currency", "id", "airline", "flight", "departure", "arrival", "stops", "cabin", "refundable", "totalCents", "durationMinutes"]);
const offerEvaluationSchema = closedObject({ offer: offerSchema, evaluation: evaluationSchema });
const missionSchema = closedObject({
  id: { type: "string", minLength: 1, maxLength: 120 },
  status: { type: "string", enum: ["ready", "offers_ready", "offer_selected", "quote_refreshed", "authorized", "denied", "ticketed", "authority_revoked"] },
  origin: { type: "string", pattern: "^[A-Z]{3}$" },
  destination: { type: "string", pattern: "^[A-Z]{3}$" },
  departureDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
  arriveBefore: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
  permittedCabins: { type: "array", items: { type: "string", enum: ["economy", "premium_economy"] }, minItems: 1, maxItems: 2, uniqueItems: true },
  maxStops: { type: "integer", minimum: 0, maximum: 2 },
  refundableOnly: { type: "boolean" },
  maxTotalCents: { type: "integer", minimum: 0, maximum: 500000 },
  currency: { const: "USD" },
  confirmationMode: { type: "string", enum: ["autonomous", "confirm_before_purchase"] },
  authority: { type: "string", enum: ["active", "revoked"] },
  expiresAt: { type: "string", format: "date-time" },
  policyVersion: { type: "integer", minimum: 1 },
  quoteVersion: { type: "integer", minimum: 0 },
  selectedOfferId: nullable({ type: "string", minLength: 1, maxLength: 80 }),
  decision: nullable({ type: "string", enum: ["authorized", "denied"] }),
  booking: nullable(bookingSchema),
});
const toolErrorSchema = closedObject({
  error: closedObject({
    code: { type: "string", enum: ["invalid_input", "invalid_state", "policy_blocked", "quote_stale", "tool_failed"] },
    message: { type: "string", minLength: 1, maxLength: 500 },
    retryable: { type: "boolean" },
    nextAction: { type: "string", minLength: 1, maxLength: 300 },
  }),
});
const result = (successSchema) => ({ oneOf: [successSchema, toolErrorSchema] });

export const toolContracts = Object.freeze([
  {
    name: "read_flight_mission",
    description: "Read the active flight mission, its exact purchasing limits, current state, and safe booking status. Later lifecycle tools, including purchase_selected_offer, are registered only when the stored state makes them valid.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: result(missionSchema),
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  {
    name: "search_flights",
    description: "Search the exact route, date, fare rules, and purchase cap already stored in the active mission. This tool intentionally accepts no filters, so the caller cannot expand authority.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: result(closedObject({ missionId: { type: "string", minLength: 1, maxLength: 120 }, offers: { type: "array", items: offerEvaluationSchema, minItems: 0, maxItems: 20 } })),
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
    outputSchema: result(missionSchema),
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  {
    name: "compare_visible_offers",
    description: "Compare offers already visible in Mission Control and return application-side policy decisions for each.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: result({ type: "array", items: offerEvaluationSchema, minItems: 0, maxItems: 20 }),
    readOnlyHint: true,
    untrustedContentHint: true,
  },
  {
    name: "select_offer",
    description: "Select one currently visible offer for purchase evaluation. This does not charge or book.",
    inputSchema: { type: "object", properties: { offerId: { type: "string", minLength: 1, maxLength: 80, pattern: "^[A-Za-z0-9_-]+$" } }, required: ["offerId"], additionalProperties: false },
    outputSchema: result(offerEvaluationSchema),
    readOnlyHint: false,
    untrustedContentHint: true,
  },
  {
    name: "refresh_selected_offer",
    description: "Refresh the selected offer before purchase and advance its application-controlled quote version.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: result(closedObject({ offer: offerSchema, quoteVersion: { type: "integer", minimum: 1 }, refreshed: { const: true } })),
    readOnlyHint: false,
    untrustedContentHint: true,
  },
  {
    name: "evaluate_purchase",
    description: "Evaluate the selected offer against the stored route, fare, price, and authority policy. The agent cannot provide its own authorization decision.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: result(closedObject({ evaluation: evaluationSchema, receipt: receiptSchema })),
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  {
    name: "purchase_selected_offer",
    description: "Issue one sandbox ticket for the selected, refreshed, authorized offer, or return the original ticket when the mission is already booked. Requires an idempotency key. Never creates a real charge or airline order.",
    inputSchema: {
      type: "object",
      properties: { idempotencyKey: { type: "string", minLength: 1, maxLength: 80, pattern: "^[A-Za-z0-9][A-Za-z0-9.:-]{0,79}$" } },
      required: ["idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: result(closedObject({ booking: bookingSchema, replayed: { type: "boolean" } })),
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  {
    name: "get_booking_receipt",
    description: "Read the canonical sandbox booking receipt without passenger or payment data.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: result({ oneOf: [bookingSchema, closedObject({ status: { const: "not_booked" } })] }),
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  {
    name: "revoke_purchase_authority",
    description: "Revoke the active mission authority so future purchase attempts are denied while prior receipts remain readable. A human can recover by replacing the mission authority.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: result(closedObject({ missionId: { type: "string", minLength: 1, maxLength: 120 }, authority: { const: "revoked" }, revoked: { const: true } })),
    readOnlyHint: false,
    untrustedContentHint: false,
  },
]);

function validateSchemaValue(schema, value, path) {
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid tool input: ${path} must be an object.`);
    const properties = schema.properties ?? {};
    for (const name of schema.required ?? []) {
      if (!Object.hasOwn(value, name)) throw new Error(`Invalid tool input: ${path}.${name} is required.`);
    }
    if (schema.additionalProperties === false) {
      const unexpected = Object.keys(value).find((name) => !Object.hasOwn(properties, name));
      if (unexpected) throw new Error(`Invalid tool input: ${path}.${unexpected} is not allowed.`);
    }
    for (const [name, child] of Object.entries(properties)) {
      if (Object.hasOwn(value, name)) validateSchemaValue(child, value[name], `${path}.${name}`);
    }
    return;
  }
  if (schema.type === "integer") {
    if (!Number.isInteger(value)) throw new Error(`Invalid tool input: ${path} must be an integer.`);
    if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`Invalid tool input: ${path} is below its minimum.`);
    if (schema.maximum !== undefined && value > schema.maximum) throw new Error(`Invalid tool input: ${path} exceeds its maximum.`);
    return;
  }
  if (schema.type === "string") {
    if (typeof value !== "string") throw new Error(`Invalid tool input: ${path} must be a string.`);
    if (schema.minLength !== undefined && value.length < schema.minLength) throw new Error(`Invalid tool input: ${path} is too short.`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) throw new Error(`Invalid tool input: ${path} is too long.`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) throw new Error(`Invalid tool input: ${path} has an invalid format.`);
    return;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") throw new Error(`Invalid tool input: ${path} must be a boolean.`);
}

export function validateToolInput(contract, input) {
  validateSchemaValue(contract.inputSchema, input, contract.name);
  return input;
}

export function activeToolNames(mission, now = new Date()) {
  const names = new Set(["read_flight_mission"]);
  const authorityUsable = mission.authority === "active" && Number.isFinite(Date.parse(mission.expiresAt)) && new Date(mission.expiresAt) > now;
  if (authorityUsable) {
    names.add("revoke_purchase_authority");
    if (!mission.booking) names.add("tighten_flight_mission");
  }
  if (authorityUsable && mission.status === "ready") names.add("search_flights");
  if (authorityUsable && ["offers_ready", "offer_selected", "quote_refreshed", "authorized", "denied"].includes(mission.status)) {
    names.add("search_flights");
    names.add("compare_visible_offers");
    names.add("select_offer");
  }
  if (authorityUsable && ["offer_selected", "quote_refreshed", "authorized", "denied"].includes(mission.status)) {
    names.add("refresh_selected_offer");
    names.add("evaluate_purchase");
  }
  if (authorityUsable && mission.status === "authorized" && mission.confirmationMode === "autonomous") names.add("purchase_selected_offer");
  if (mission.booking) {
    names.add("get_booking_receipt");
    names.add("purchase_selected_offer");
  }
  return [...names];
}
