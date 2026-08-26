import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMission } from "./engine.js";
import { activeToolNames, toolContracts } from "./tool-contracts.js";

test("tool names are unique and use bounded schemas", () => {
  assert.equal(new Set(toolContracts.map((tool) => tool.name)).size, toolContracts.length);
  for (const tool of toolContracts) {
    assert.match(tool.name, /^[a-z0-9_]{1,128}$/);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
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

test("the browser entrypoint uses the required WebMCP API", () => {
  const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.match(source, /document\.modelContext\.registerTool\(\{/);
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
  assert.match(document, /rel="canonical" href="https:\/\/flightsweeper-webmcp\.vercel\.app\/"/);
  assert.match(document, /property="og:title"/);
  assert.match(document, /name="robots" content="index,follow,max-image-preview:large"/);
  assert.match(document, /Example agent run/);
  assert.match(document, />Challenge privacy<\/a>/);
  assert.doesNotMatch(document, /> Live sandbox</);
});

test("public governance documents preserve the challenge trust boundary", () => {
  const requiredDocuments = ["README.md", "SECURITY.md", "PRIVACY.md", "CONTRIBUTING.md", "STANDARDS.md", "ASSET_PROVENANCE.md", "RELEASE_CHECKLIST.md"];
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
  const headers = Object.fromEntries(deployment.headers[0].headers.map(({ key, value }) => [key, value]));
  assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Permissions-Policy"], /tools=\(self\)/);
  assert.match(headers["Permissions-Policy"], /payment=\(\)/);
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Strict-Transport-Security"], /max-age=63072000/);
});
