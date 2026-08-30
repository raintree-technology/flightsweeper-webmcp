import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { createMission } from "./engine.js";
import { activeToolNames, toolContracts } from "./tool-contracts.js";

test("tool names are unique and use bounded schemas", () => {
  assert.equal(new Set(toolContracts.map((tool) => tool.name)).size, toolContracts.length);
  for (const tool of toolContracts) {
    assert.match(tool.name, /^[a-z0-9_]{1,128}$/);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
    assert.ok(tool.outputSchema, `${tool.name} must publish a result schema`);
    assert.equal(tool.outputSchema.oneOf.length, 2, `${tool.name} must describe success and error results`);
    assert.doesNotThrow(() => z.fromJSONSchema(tool.outputSchema), `${tool.name} result schema must compile`);
  }
});

test("caller-provided identifiers and quantities have explicit limits", () => {
  const byName = Object.fromEntries(toolContracts.map((tool) => [tool.name, tool]));
  assert.equal(byName.select_offer.inputSchema.properties.offerId.maxLength, 80);
  assert.equal(byName.purchase_selected_offer.inputSchema.properties.idempotencyKey.maxLength, 80);
  assert.equal(byName.tighten_flight_mission.inputSchema.properties.maxTotalCents.maximum, 500000);
  assert.equal(byName.tighten_flight_mission.inputSchema.properties.maxStops.maximum, 2);
});

test("state-changing and financial tools are not marked read-only", () => {
  const mutating = new Set([
    "search_flights",
    "tighten_flight_mission",
    "select_offer",
    "refresh_selected_offer",
    "evaluate_purchase",
    "purchase_selected_offer",
    "revoke_purchase_authority",
  ]);
  for (const tool of toolContracts) {
    if (mutating.has(tool.name)) assert.equal(tool.readOnlyHint, false, tool.name);
  }
});

test("provider-backed offer tools identify untrusted content", () => {
  const untrusted = new Set(["search_flights", "compare_visible_offers", "select_offer", "refresh_selected_offer"]);
  for (const tool of toolContracts) {
    assert.equal(tool.untrustedContentHint, untrusted.has(tool.name), tool.name);
  }
});

test("tool exposure follows transaction state", () => {
  const mission = createMission();
  assert.deepEqual(new Set(activeToolNames(mission)), new Set(["read_flight_mission", "tighten_flight_mission", "revoke_purchase_authority", "search_flights"]));
  mission.status = "authorized";
  assert.equal(activeToolNames(mission).includes("purchase_selected_offer"), true);
  mission.status = "ticketed";
  mission.booking = { id: "booking" };
  assert.deepEqual(new Set(activeToolNames(mission)), new Set(["read_flight_mission", "revoke_purchase_authority", "purchase_selected_offer", "get_booking_receipt"]));
  mission.authority = "revoked";
  assert.deepEqual(new Set(activeToolNames(mission)), new Set(["read_flight_mission", "purchase_selected_offer", "get_booking_receipt"]));
});

test("the clean-state lifecycle makes every declared browser tool reachable", () => {
  const mission = createMission();
  const reachable = new Set(activeToolNames(mission));
  for (const status of ["ready", "offers_ready", "offer_selected", "quote_refreshed", "authorized", "ticketed"]) {
    mission.status = status;
    if (status === "ticketed") mission.booking = { id: "booking" };
    for (const name of activeToolNames(mission)) reachable.add(name);
  }
  assert.deepEqual(reachable, new Set(toolContracts.map(({ name }) => name)));
});

test("the browser entrypoint uses the required WebMCP API", () => {
  const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.match(source, /document\.modelContext\.registerTool\(\{/);
  assert.match(source, /outputSchema: contract\.outputSchema/);
  assert.match(source, /code, message, retryable/);
  assert.match(source, /nextAction/);
});

test("provider content is rendered without HTML injection sinks", () => {
  const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /untrustedContentHint/);
});

test("the visible activity trail labels post-ticket retries as replays", () => {
  const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.match(source, /const result = purchase\([\s\S]*?if \(result\.replayed\)[\s\S]*?Duplicate safely resolved[\s\S]*?const bookingReceipt/);
});

test("the public document declares identity, discovery, and truthful example status", () => {
  const document = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.match(document, /rel="canonical" href="https:\/\/webmcp\.flightsweeper\.com\/"/);
  assert.match(document, /property="og:title"/);
  assert.match(document, /name="robots" content="index,follow,max-image-preview:large"/);
  assert.match(document, /Example agent run/);
  assert.match(document, /href="\.\/terms\.html">Terms<\/a>/);
  assert.match(document, /href="\.\/privacy\.html">Privacy<\/a>/);
  assert.match(document, /Selecting “Create a flight mission,”[\s\S]*?means you agree to the/);
  assert.match(document, /acknowledge the <a href="\.\/privacy\.html">Privacy Policy<\/a>/);
  assert.match(document, /class="next-action" aria-live="polite" aria-atomic="true"/);
  assert.match(document, /class="receipt" id="receipt" aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(document, /> Live sandbox</);
});

test("public legal pages are scoped to the sandbox and identify the operator", () => {
  const terms = readFileSync(new URL("./terms.html", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("./privacy.html", import.meta.url), "utf8");
  for (const document of [terms, privacy]) {
    assert.match(document, /FinSync LLC/);
    assert.match(document, /legal@raintree\.technology/);
    assert.match(document, /August 26, 2026/);
    assert.match(document, /href="\.\/terms\.html"/);
    assert.match(document, /href="\.\/privacy\.html"/);
  }
  assert.match(terms, /cannot charge a card, create an airline order/i);
  assert.match(terms, /name="legal-version" content="terms-2026-08-26\.1"/);
  assert.match(terms, /CST 2172984-70/);
  assert.match(terms, /Registration as a seller of travel does not constitute approval by the State of California/);
  assert.match(privacy, /flightsweeper\.webmcp\.challenge\.v1/);
  assert.match(privacy, /name="legal-version" content="privacy-2026-08-26\.1"/);
  assert.match(privacy, /Vercel may process ordinary network and device metadata/);
  assert.match(privacy, /do not sell personal information/i);
  assert.match(privacy, /Do Not Track and Global Privacy Control/);
  assert.match(privacy, /authorized agent may submit a request on your behalf/i);
  assert.match(privacy, /conspicuous notice on the challenge homepage for a material change/i);
});

test("public governance documents preserve the challenge trust boundary", () => {
  const requiredDocuments = ["README.md", "API.md", "SECURITY.md", "PRIVACY.md", "CONTRIBUTING.md", "STANDARDS.md", "LEGAL_REVIEW.md", "ASSET_PROVENANCE.md", "RELEASE_CHECKLIST.md"];
  for (const path of requiredDocuments) {
    assert.doesNotThrow(() => readFileSync(new URL(`./${path}`, import.meta.url), "utf8"), path);
  }

  const security = readFileSync(new URL("./SECURITY.md", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("./PRIVACY.md", import.meta.url), "utf8");
  const standards = readFileSync(new URL("./STANDARDS.md", import.meta.url), "utf8");
  assert.match(security, /cannot charge a card or create an airline order/i);
  assert.match(security, /untrustedContentHint/);
  assert.match(privacy, /flightsweeper\.webmcp\.challenge\.v1/);
  assert.match(privacy, /does not request or store names/i);
  assert.match(standards, /not a certification claim/i);
  assert.match(standards, /Do not mark a manual gate complete/i);
});

test("the static application has no outbound data client", () => {
  const sources = ["app.js", "engine.js", "state.js", "tool-contracts.js"]
    .map((path) => readFileSync(new URL(`./${path}`, import.meta.url), "utf8"))
    .join("\n");
  assert.doesNotMatch(sources, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|sendBeacon\s*\(/);
});

test("deployment configuration constrains browser authority", () => {
  const deployment = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));
  const globalHeaderRule = deployment.headers.find(({ source }) => source === "/(.*)");
  const headers = Object.fromEntries(globalHeaderRule.headers.map(({ key, value }) => [key, value]));
  assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Permissions-Policy"], /tools=\(self\)/);
  assert.match(headers["Permissions-Policy"], /payment=\(\)/);
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Strict-Transport-Security"], /max-age=63072000/);
});
