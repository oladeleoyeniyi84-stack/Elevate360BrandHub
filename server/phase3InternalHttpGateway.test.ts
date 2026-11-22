import assert from "node:assert/strict";
import test from "node:test";
import { InternalHttpEgressGateway } from "./webops/phase3InternalHttpGateway";
import { Phase3DiagnoseWorker } from "./webops/phase3Worker";
import type { WebOpsOriginRegistry } from "./webops/phase3GatewayPolicy";

const origin = "https://www.elevate360official.com/";
const registry: WebOpsOriginRegistry = {
  version: 1,
  origins: [{ origin: "https://www.elevate360official.com", enabled: true, approvedBy: "founder", approvedAt: "2026-10-14T16:00:00Z" }],
};
const endpoint = "http://webops-egress-gateway:8787/inspect";
const input = { requestId: "probe-1", url: origin, method: "GET" as const, registryVersion: 1 };

test("internal gateway client rejects arbitrary endpoints before network access", () => {
  const unreachable = (async () => { throw new Error("unexpected_network"); }) as typeof fetch;
  for (const url of ["https://example.com/inspect", "http://127.0.0.1:8787/inspect", "http://webops-egress-gateway:8787/other", "http://webops-egress-gateway:8787/inspect?target=bad"]) {
    assert.throws(() => new InternalHttpEgressGateway(registry, url, unreachable), /gateway_endpoint_must_be_internal/);
  }
});

test("internal client sends only to gateway, with exact GET policy and no direct fallback", async () => {
  const calls: string[] = [];
  const transport = (async (url: URL | RequestInfo, options?: RequestInit) => {
    calls.push(String(url));
    assert.equal(options?.method, "POST");
    assert.equal(options?.redirect, "error");
    assert.deepEqual(JSON.parse(String(options?.body)), input);
    return Response.json({ status: 204, audit: {
      sequence: 1, requestId: input.requestId, url: input.url,
      hostname: "www.elevate360official.com", resolvedAddresses: ["93.184.216.34"],
      decision: "allow", reason: "approved_public_target", registryVersion: 1, immutable: true,
    } });
  }) as typeof fetch;
  const gateway = new InternalHttpEgressGateway(registry, endpoint, transport);
  const result = await gateway.request(input);
  assert.equal(result.response.status, 204);
  assert.deepEqual(calls, [endpoint]);
  assert.equal(result.auditEvent.immutable, true);
  assert.equal(Object.isFrozen(result.auditEvent), true);
});

test("unapproved origin fails without calling transport", async () => {
  let count = 0;
  const gateway = new InternalHttpEgressGateway(registry, endpoint, (async () => { count++; throw Error("unexpected"); }) as typeof fetch);
  await assert.rejects(gateway.request({ ...input, url: "https://example.com/" }), /gateway_origin_not_approved/);
  assert.equal(count, 0);
});

test("worker inspection fails closed on gateway outage, never retries direct", async () => {
  let attempts = 0;
  const transport = (async () => { attempts++; throw Error("gateway_offline"); }) as typeof fetch;
  const gateway = new InternalHttpEgressGateway(registry, endpoint, transport);
  const worker = new Phase3DiagnoseWorker({ gateway, registry, maxTargets: 1 });
  const result = await worker.run([origin]);
  assert.equal(attempts, 1);
  assert.equal(result.results[0]?.ok, false);
  assert.equal(result.results[0]?.status, null);
  assert.equal(result.directNetworkAccess, false);
  assert.equal(result.productionWrites, false);
});

test("response without matching immutable audit proof fails closed", async () => {
  const transport = (async () => Response.json({ status: 200, audit: {
    sequence: 1, requestId: "wrong", url: origin, hostname: "www.elevate360official.com",
    resolvedAddresses: [], decision: "allow", reason: "test", registryVersion: 1, immutable: true,
  } })) as typeof fetch;
  const gateway = new InternalHttpEgressGateway(registry, endpoint, transport);
  await assert.rejects(gateway.request(input), /gateway_audit_invalid/);
});
