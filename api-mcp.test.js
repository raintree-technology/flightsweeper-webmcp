import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Readable } from "node:stream";
import { callRemoteTool, MCP_VERSIONS, publicAgentManifest, remoteOutputSchemas, remoteTools } from "./agent-manifest.js";
import agentToolsHandler from "./api/agent-tools.js";
import handler, { remoteOutputValidators } from "./api/mcp.js";

function request(method, body = "", headers = {}) {
  const req = Readable.from(body ? [body] : []);
  req.method = method;
  req.headers = { host: "webmcp.flightsweeper.com", ...headers };
  return req;
}

function response() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = String(value);
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}

async function withHttpServer(run) {
  const server = http.createServer(async (req, res) => {
    res.status = function status(statusCode) { this.statusCode = statusCode; return this; };
    res.json = function json(body) {
      if (!this.hasHeader("content-type")) this.setHeader("content-type", "application/json; charset=utf-8");
      this.end(JSON.stringify(body));
      return this;
    };
    await handler(req, res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await run(`http://localhost:${server.address().port}/mcp`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function rpc(url, body) {
  const result = await fetch(url, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json", "mcp-protocol-version": "2025-11-25" },
    body: JSON.stringify(body),
  });
  return { status: result.status, requestId: result.headers.get("x-request-id"), body: await result.json() };
}

test("preflight includes public MCP CORS headers", async () => {
  const res = response();
  await handler(request("OPTIONS"), res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["access-control-allow-origin"], "*");
  assert.equal(res.headers["access-control-allow-methods"], "POST, OPTIONS");
  assert.match(res.headers["access-control-allow-headers"], /x-request-id/);
});

test("malformed JSON returns a JSON-RPC parse error", async () => {
  const res = response();
  await handler(request("POST", "{", { "x-forwarded-for": "203.0.113.41" }), res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    jsonrpc: "2.0",
    id: null,
    error: { code: -32700, message: "Parse error" },
  });
  assert.match(res.headers["x-request-id"], /^[0-9a-f-]{36}$/);
});

test("anonymous requests are bounded and advertise retry timing", async () => {
  let res;
  for (let index = 0; index < 31; index += 1) {
    res = response();
    await handler(request("POST", "{", { "x-forwarded-for": "203.0.113.42" }), res);
  }
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers["x-ratelimit-limit"], "30");
  assert.equal(res.headers["x-ratelimit-remaining"], "0");
  assert.ok(Number(res.headers["retry-after"]) > 0);
  assert.equal(res.body.error.code, -32029);
});

test("a valid caller request ID is returned for correlation", async () => {
  const res = response();
  await handler(request("POST", "{", { "x-forwarded-for": "203.0.113.43", "x-request-id": "judge-run:17" }), res);
  assert.equal(res.headers["x-request-id"], "judge-run:17");
  assert.match(res.headers["access-control-expose-headers"], /x-request-id/);
});

test("unsupported methods advertise the MCP method contract", async () => {
  const res = response();
  await handler(request("GET"), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "POST, OPTIONS");
  assert.equal(res.body.error.code, -32600);
});

test("the public MCP rejects credentials and foreign browser origins", async () => {
  const withCredentials = response();
  await handler(request("POST", "{}", { authorization: "Bearer example", "x-forwarded-for": "203.0.113.44" }), withCredentials);
  assert.equal(withCredentials.statusCode, 400);
  assert.equal(withCredentials.body.error.code, -32001);

  const foreignOrigin = response();
  await handler(request("POST", "{}", { origin: "https://example.com", "x-forwarded-for": "203.0.113.45" }), foreignOrigin);
  assert.equal(foreignOrigin.statusCode, 403);
  assert.equal(foreignOrigin.body.error.code, -32004);

  for (const [index, origin] of ["https://webmcp.flightsweeper.com", "https://flightsweeper-webmcp.vercel.app"].entries()) {
    const allowedOrigin = response();
    await handler(request("POST", "{", { origin, "x-forwarded-for": `203.0.113.${47 + index}` }), allowedOrigin);
    assert.equal(allowedOrigin.statusCode, 400);
    assert.equal(allowedOrigin.body.error.code, -32700);
  }
});

test("pre-parsed request bodies remain subject to the 32 KiB limit", async () => {
  const req = request("POST", "", { "x-forwarded-for": "203.0.113.46" });
  req.body = { value: "x".repeat(33_000) };
  const res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 413);
  assert.equal(res.body.error.code, -32600);
});

test("the public MCP kill switch returns bounded retry guidance", async () => {
  const previous = process.env.MCP_PUBLIC_DISABLED;
  process.env.MCP_PUBLIC_DISABLED = "1";
  try {
    const res = response();
    await handler(request("POST"), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.headers["retry-after"], "60");
    assert.equal(res.body.error.code, -32003);
  } finally {
    if (previous === undefined) delete process.env.MCP_PUBLIC_DISABLED;
    else process.env.MCP_PUBLIC_DISABLED = previous;
  }
});

test("every remote tool publishes and satisfies a closed output contract", () => {
  assert.deepEqual(new Set(Object.keys(remoteOutputSchemas)), new Set(remoteTools.map((tool) => tool.name)));
  assert.deepEqual(new Set(Object.keys(remoteOutputValidators)), new Set(remoteTools.map((tool) => tool.name)));
  for (const tool of remoteTools) {
    assert.equal(tool.outputSchema.additionalProperties, false);
    assert.deepEqual(remoteOutputValidators[tool.name].parse(callRemoteTool(tool.name)), callRemoteTool(tool.name));
  }
});

test("the public agent manifest has explicit lifecycle and bounded remote outputs", () => {
  const manifest = publicAgentManifest();
  assert.equal(manifest.schemaVersion, "1.0.0");
  assert.equal(manifest.modified, "2026-08-30");
  assert.equal(manifest.boundary.includes("No real supplier"), true);
  assert.match(manifest.webmcp.lifecycle, /All browser tools remain discoverable/);
  assert.equal(manifest.webmcp.tools.length, 10);
  assert.equal(manifest.mcp.tools.every((tool) => tool.outputSchema.additionalProperties === false), true);
});

test("the agent manifest endpoint supports discovery without credentials", () => {
  const getResponse = response();
  agentToolsHandler({ method: "GET" }, getResponse);
  assert.equal(getResponse.statusCode, 200);
  assert.equal(getResponse.headers["access-control-allow-origin"], "*");
  assert.equal(getResponse.headers["cache-control"], "public, max-age=3600, stale-while-revalidate=86400");
  assert.equal(getResponse.body.schemaVersion, "1.0.0");

  const headResponse = response();
  agentToolsHandler({ method: "HEAD" }, headResponse);
  assert.equal(headResponse.statusCode, 200);
  assert.equal(headResponse.body, undefined);

  const postResponse = response();
  agentToolsHandler({ method: "POST" }, postResponse);
  assert.equal(postResponse.statusCode, 405);
  assert.equal(postResponse.headers.allow, "GET, HEAD, OPTIONS");
  assert.equal(postResponse.body.error.code, "method_not_allowed");
});

test("the Streamable HTTP endpoint initializes, lists tools, and returns structured output", async () => {
  await withHttpServer(async (url) => {
    for (const protocolVersion of MCP_VERSIONS) {
      const initialized = await rpc(url, { jsonrpc: "2.0", id: `init-${protocolVersion}`, method: "initialize", params: { protocolVersion, capabilities: {}, clientInfo: { name: "contract-test", version: "1.0.0" } } });
      assert.equal(initialized.status, 200);
      assert.equal(initialized.body.result.protocolVersion, protocolVersion);
      assert.match(initialized.requestId, /^[0-9a-f-]{36}$/);
    }

    const listed = await rpc(url, { jsonrpc: "2.0", id: "list-1", method: "tools/list", params: {} });
    assert.equal(listed.status, 200);
    assert.deepEqual(new Set(listed.body.result.tools.map((tool) => tool.name)), new Set(remoteTools.map((tool) => tool.name)));
    assert.equal(listed.body.result.tools.every((tool) => tool.outputSchema.additionalProperties === false), true);

    const called = await rpc(url, { jsonrpc: "2.0", id: "call-1", method: "tools/call", params: { name: "get_challenge_capabilities", arguments: {} } });
    assert.equal(called.status, 200);
    assert.equal(called.body.result.structuredContent.realTransactions, false);
    assert.equal(called.body.result.structuredContent.remoteMcpToolCount, 4);

    const invalid = await rpc(url, { jsonrpc: "2.0", id: "call-2", method: "tools/call", params: { name: "get_safety_model", arguments: { unexpected: true } } });
    assert.equal(invalid.status, 200);
    assert.equal(invalid.body.result.isError, true);
    assert.match(invalid.body.result.content[0].text, /Input validation error/);
  });
});
