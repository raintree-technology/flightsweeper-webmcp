import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { callRemoteTool, remoteTools } from "../agent-manifest.js";

const MAX_BODY_BYTES = 32768;
const requestWindows = new Map();
const jsonValue = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue)]));
const structuredOutput = z.object({}).catchall(jsonValue);
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "accept, content-type, mcp-protocol-version",
  "access-control-expose-headers": "mcp-protocol-version",
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
};

function send(res, status, body) {
  for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
  res.status(status).json(body);
}

function title(name) {
  return name.split("_").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(" ");
}

function createServer() {
  const server = new McpServer(
    { name: "flightsweeper-public", version: "1.0.0" },
    { instructions: "Anonymous, read-only information about the FlightSweeper synthetic sandbox. Never performs real travel transactions." },
  );
  for (const tool of remoteTools) {
    server.registerTool(tool.name, {
      title: title(tool.name),
      description: tool.description,
      inputSchema: z.object({}).strict(),
      outputSchema: structuredOutput,
      annotations: tool.annotations,
    }, async () => {
      const structuredContent = callRemoteTool(tool.name);
      return { content: [{ type: "text", text: JSON.stringify(structuredContent) }], structuredContent };
    });
  }
  return server;
}

function rateLimited(req) {
  const key = String(req.headers["x-forwarded-for"] ?? "anonymous").split(",")[0].trim();
  const now = Date.now();
  const window = requestWindows.get(key);
  if (!window || now >= window.resetAt) {
    requestWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  window.count += 1;
  return window.count > 60;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Method not allowed" } });
  if (process.env.MCP_PUBLIC_DISABLED === "1") return send(res, 503, { jsonrpc: "2.0", id: null, error: { code: -32003, message: "Public MCP is temporarily disabled" } });
  const origin = req.headers.origin;
  if (origin && origin !== "https://flightsweeper-webmcp.vercel.app") return send(res, 403, { jsonrpc: "2.0", id: null, error: { code: -32004, message: "Origin is not allowed" } });
  const host = String(req.headers.host ?? "").split(":")[0];
  if (host !== "flightsweeper-webmcp.vercel.app" && !host.endsWith(".vercel.app") && host !== "localhost") return send(res, 403, { jsonrpc: "2.0", id: null, error: { code: -32004, message: "Host is not allowed" } });
  if (req.headers.authorization || req.headers.cookie) return send(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Credentials are not accepted by this public endpoint" } });
  if (rateLimited(req)) return send(res, 429, { jsonrpc: "2.0", id: null, error: { code: -32029, message: "Rate limit exceeded" } });
  const size = Number(req.headers["content-length"] ?? 0);
  if (size > MAX_BODY_BYTES) return send(res, 413, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request body exceeds 32 KiB" } });
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
