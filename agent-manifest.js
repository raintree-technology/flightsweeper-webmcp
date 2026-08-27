import { toolContracts } from "./tool-contracts.js";

export const SITE_URL = "https://flightsweeper-webmcp.vercel.app";
export const MCP_VERSION = "2025-06-18";

export const remoteTools = Object.freeze([
  {
    name: "get_challenge_capabilities",
    description: "Describe the public FlightSweeper WebMCP challenge and its synthetic-only boundary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_flight_tool_contracts",
    description: "List the browser-local WebMCP tool contracts without executing or mutating a mission.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_sandbox_inventory",
    description: "Describe the bounded synthetic inventory used by the challenge.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_safety_model",
    description: "Describe FlightSweeper's application-enforced policy, revocation, and idempotency model.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
].map((tool) => ({
  ...tool,
  description: `Use this when an agent needs to ${tool.description.charAt(0).toLowerCase()}${tool.description.slice(1)} Do not use it for real travel transactions or private data.`,
  title: tool.name.split("_").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(" "),
  outputSchema: { type: "object", additionalProperties: true },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, untrustedContentHint: false },
})));

export function publicAgentManifest() {
  return {
    schemaVersion: "1.0.0",
    canonicalUrl: `${SITE_URL}/agent-tools.json`,
    site: { name: "FlightSweeper WebMCP Challenge Edition", url: SITE_URL, environment: "synthetic sandbox" },
    boundary: "No real supplier, payment, passenger identity, reservation, or ticketing system is connected.",
    webmcp: {
      state: "browser-local",
      tools: toolContracts.map((tool) => ({
        ...tool,
        annotations: {
          readOnlyHint: tool.readOnlyHint,
          destructiveHint: false,
          openWorldHint: false,
          untrustedContentHint: tool.untrustedContentHint,
        },
      })),
      lifecycle: "Only tools valid for the current mission state are registered.",
    },
    mcp: { transport: `${SITE_URL}/mcp`, protocolVersion: MCP_VERSION, tools: remoteTools },
    modified: "2026-08-26",
  };
}

const capabilities = {
  name: "FlightSweeper WebMCP Challenge Edition",
  mode: "synthetic sandbox",
  webmcpToolCount: toolContracts.length,
  remoteMcpToolCount: remoteTools.length,
  realTransactions: false,
  canonicalUrl: SITE_URL,
};

const inventory = {
  kind: "deterministic synthetic fixtures",
  routes: ["LAX-JFK"],
  supplierConnectivity: false,
  containsPersonalData: false,
  caveat: "Inventory is illustrative and must not be used for real travel decisions.",
};

const safety = {
  authority: "Agents may only tighten a human-created mandate.",
  policy: "Route, fare, price, expiry, and authority are reloaded from application state at execution.",
  idempotency: "A completed sandbox purchase always replays the original receipt.",
  revocation: "Revocation blocks future purchases without deleting prior evidence.",
  privacy: "Passenger identity and payment data are neither requested nor accepted.",
};

export function callRemoteTool(name) {
  if (name === "get_challenge_capabilities") return capabilities;
  if (name === "get_flight_tool_contracts") return publicAgentManifest().webmcp;
  if (name === "get_sandbox_inventory") return inventory;
  if (name === "get_safety_model") return safety;
  throw new Error(`Unknown tool: ${name}`);
}
