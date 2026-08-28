import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler from "./api/mcp.js";

function request(method, body = "", headers = {}) {
  const req = Readable.from(body ? [body] : []);
  req.method = method;
  req.headers = { host: "flightsweeper-webmcp.vercel.app", ...headers };
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

test("preflight includes public MCP CORS headers", async () => {
  const res = response();
  await handler(request("OPTIONS"), res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["access-control-allow-origin"], "*");
  assert.equal(res.headers["access-control-allow-methods"], "POST, OPTIONS");
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
