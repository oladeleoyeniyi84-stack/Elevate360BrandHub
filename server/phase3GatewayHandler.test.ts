import assert from "node:assert/strict";
import test from "node:test";
import { createInternalGatewayHandler } from "./webops/phase3GatewayHandler";
import type { EgressGateway } from "./webops/phase3GatewayPolicy";

const token = "test-only-shared-token-with-at-least-32-characters";
const url = "http://webops-egress-gateway:8787/inspect";
let calls = 0;
const gateway: EgressGateway = {
  name: "fixture",
  request: async input => {
    calls++;
    return {
      response: new Response(null, { status: 204 }),
      auditEvent: Object.freeze({
        sequence: calls, requestId: input.requestId, url: input.url,
        hostname: "www.elevate360official.com", resolvedAddresses: Object.freeze(["93.184.216.34"]),
        decision: "allow", reason: "fixture", registryVersion: 1, immutable: true,
      }),
    };
  },
};

function post(payload: unknown, authorization = `Bearer ${token}`) {
  return new Request(url, {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
const valid = { requestId: "test-1", url: "https://www.elevate360official.com/", method: "GET", registryVersion: 1 };

test("internal handler requires strong shared token", () => {
  assert.throws(() => createInternalGatewayHandler(gateway, "short"), /gateway_shared_token_missing_or_short/);
});

test("internal handler rejects missing or incorrect authorization before invoking gateway", async () => {
  const handler = createInternalGatewayHandler(gateway, token);
  const before = calls;
  assert.equal((await handler(post(valid, "Bearer wrong"))).status, 401);
  assert.equal((await handler(new Request(url, { method: "GET" }))).status, 404);
  assert.equal(calls, before);
});

test("internal handler refuses extraneous fields and non-GET inspection", async () => {
  const handler = createInternalGatewayHandler(gateway, token);
  const before = calls;
  assert.equal((await handler(post({ ...valid, method: "POST" }))).status, 400);
  assert.equal((await handler(post({ ...valid, privilege: "admin" }))).status, 400);
  assert.equal(calls, before);
});

test("internal handler passes only validated inspection and returns audit receipt", async () => {
  const handler = createInternalGatewayHandler(gateway, token);
  const response = await handler(post(valid));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, 204);
  assert.equal(data.audit.requestId, "test-1");
  assert.equal(data.audit.immutable, true);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("internal handler fails closed when gateway dependency is unavailable", async () => {
  const broken: EgressGateway = { name: "offline", request: async () => { throw Error("gateway_offline"); } };
  const handler = createInternalGatewayHandler(broken, token);
  assert.equal((await handler(post(valid))).status, 502);
});

test("internal handler rejects oversized request before gateway call", async () => {
  const handler = createInternalGatewayHandler(gateway, token);
  const before = calls;
  const response = await handler(post({ ...valid, filler: "x".repeat(4096) }));
  assert.equal(response.status, 413);
  assert.equal(calls, before);
});
