import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { callRemoteTool, remoteTools } from "../agent-manifest.js";

const MAX_BODY_BYTES = 32768;
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_KEYS = 10_000;
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

export const config = { api: { bodyParser: false } };

function applyHeaders(res, extra = {}) {
  for (const [key, value] of Object.entries({ ...CORS, ...extra })) res.setHeader(key, value);
}

function send(res, status, body, extra = {}) {
  applyHeaders(res, extra);
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

function rateLimitKey(req) {
  return String(req.headers["x-vercel-forwarded-for"] ?? req.headers["x-forwarded-for"] ?? "anonymous").split(",")[0].trim();
}

function consumeRateLimit(req) {
  let key = rateLimitKey(req);
  const now = Date.now();
  if (requestWindows.size >= MAX_RATE_LIMIT_KEYS && !requestWindows.has(key)) {
    for (const [candidate, window] of requestWindows) if (now >= window.resetAt) requestWindows.delete(candidate);
    if (requestWindows.size >= MAX_RATE_LIMIT_KEYS) key = "overflow";
  }
  const window = requestWindows.get(key);
  if (!window || now >= window.resetAt) {
    const resetAt = now + WINDOW_MS;
    requestWindows.set(key, { count: 1, resetAt });
    return { limited: false, remaining: RATE_LIMIT - 1, resetAt };
  }
  window.count += 1;
  return { limited: window.count > RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - window.count), resetAt: window.resetAt };
}

function rateHeaders(rate, includeRetryAfter = false) {
  const result = {
    "x-ratelimit-limit": String(RATE_LIMIT),
    "x-ratelimit-remaining": String(rate.remaining),
    "x-ratelimit-reset": String(Math.ceil(rate.resetAt / 1000)),
  };
  if (includeRetryAfter) result["retry-after"] = String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)));
  return result;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Request body exceeds 32 KiB"), { status: 413, code: -32600 });
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) throw Object.assign(new Error("Request body is required"), { status: 400, code: -32600 });
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Parse error"), { status: 400, code: -32700 });
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    applyHeaders(res);
    return res.status(204).end();
  }
  if (req.method !== "POST") return send(res, 405, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Method not allowed" } });
  if (process.env.MCP_PUBLIC_DISABLED === "1") return send(res, 503, { jsonrpc: "2.0", id: null, error: { code: -32003, message: "Public MCP is temporarily disabled" } });
  const origin = req.headers.origin;
  if (origin && origin !== "https://flightsweeper-webmcp.vercel.app") return send(res, 403, { jsonrpc: "2.0", id: null, error: { code: -32004, message: "Origin is not allowed" } });
  const host = String(req.headers.host ?? "").split(":")[0];
  if (host !== "flightsweeper-webmcp.vercel.app" && !host.endsWith(".vercel.app") && host !== "localhost") return send(res, 403, { jsonrpc: "2.0", id: null, error: { code: -32004, message: "Host is not allowed" } });
  if (req.headers.authorization || req.headers.cookie) return send(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Credentials are not accepted by this public endpoint" } });
  const rate = consumeRateLimit(req);
  const limitHeaders = rateHeaders(rate, rate.limited);
  if (rate.limited) return send(res, 429, { jsonrpc: "2.0", id: null, error: { code: -32029, message: "Rate limit exceeded" } }, limitHeaders);
  const size = Number(req.headers["content-length"] ?? 0);
  if (size > MAX_BODY_BYTES) return send(res, 413, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request body exceeds 32 KiB" } }, limitHeaders);
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return send(res, error.status ?? 400, { jsonrpc: "2.0", id: null, error: { code: error.code ?? -32600, message: error.message } }, limitHeaders);
  }
  applyHeaders(res, limitHeaders);
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
