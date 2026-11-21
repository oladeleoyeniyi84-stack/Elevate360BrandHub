import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryAppendOnlyGatewayAudit } from "./webops/phase3Audit";
import { LocalFixtureEgressGateway } from "./webops/phase3LocalGateway";
import {
  assertApprovedGatewayTarget,
  normalizeRegistry,
  type EgressGateway,
  type WebOpsOriginRegistry,
} from "./webops/phase3GatewayPolicy";
import { Phase3DiagnoseWorker } from "./webops/phase3Worker";

const registry: WebOpsOriginRegistry = {
  version: 1,
  origins: [
    {
      origin: "https://www.elevate360official.com",
      enabled: true,
      approvedBy: "founder",
      approvedAt: "2026-10-14T16:00:00Z",
    },
  ],
};

test("Phase 3 registry accepts only explicit Founder-approved HTTPS origins", () => {
  const normalized = normalizeRegistry(registry);
  assert.equal(normalized.origins[0]?.origin, "https://www.elevate360official.com");
  assert.equal(
    assertApprovedGatewayTarget("https://www.elevate360official.com/work", registry).origin,
    "https://www.elevate360official.com",
  );
  assert.throws(
    () => assertApprovedGatewayTarget("https://example.com/", registry),
    /gateway_origin_not_approved/,
  );
  assert.throws(
    () =>
      normalizeRegistry({
        version: 1,
        origins: [{ ...registry.origins[0]!, origin: "http://www.elevate360official.com" }],
      }),
    /origin_registry_entry_invalid/,
  );
});

test("fixture gateway denies private DNS before transport and records immutable evidence", async () => {
  const audit = new InMemoryAppendOnlyGatewayAudit();
  let transportCalls = 0;
  const gateway = new LocalFixtureEgressGateway({
    registry,
    dnsResolver: async () => [{ address: "169.254.169.254", family: 4 }],
    transport: async () => {
      transportCalls++;
      return new Response("unexpected", { status: 200 });
    },
    audit,
  });

  await assert.rejects(
    gateway.request({
      requestId: "metadata-test",
      url: "https://www.elevate360official.com/",
      method: "GET",
      registryVersion: 1,
    }),
    /gateway_denied:gateway_dns_unsafe/,
  );

  assert.equal(transportCalls, 0);
  const events = audit.snapshot();
  assert.equal(events.length, 1);
  assert.equal(events[0]?.decision, "deny");
  assert.deepEqual(events[0]?.resolvedAddresses, ["169.254.169.254"]);
  assert.equal(events[0]?.immutable, true);
  assert.equal(Object.isFrozen(events[0]), true);
  assert.equal(Object.isFrozen(events[0]?.resolvedAddresses), true);
});

test("fixture gateway fails closed when transport fails and never retries directly", async () => {
  const audit = new InMemoryAppendOnlyGatewayAudit();
  let transportCalls = 0;
  const gateway = new LocalFixtureEgressGateway({
    registry,
    dnsResolver: async () => [{ address: "93.184.216.34", family: 4 }],
    transport: async () => {
      transportCalls++;
      throw new Error("fixture_gateway_unavailable");
    },
    audit,
  });

  await assert.rejects(
    gateway.request({
      requestId: "gateway-outage",
      url: "https://www.elevate360official.com/",
      method: "GET",
      registryVersion: 1,
    }),
    /gateway_denied:fixture_gateway_unavailable/,
  );
  assert.equal(transportCalls, 1);
  assert.equal(audit.snapshot()[0]?.decision, "deny");
  assert.equal(audit.snapshot()[0]?.reason, "fixture_gateway_unavailable");
});

test("fixture gateway rejects stale registry versions before DNS or transport", async () => {
  const audit = new InMemoryAppendOnlyGatewayAudit();
  let dnsCalls = 0;
  let transportCalls = 0;
  const gateway = new LocalFixtureEgressGateway({
    registry,
    dnsResolver: async () => {
      dnsCalls++;
      return [{ address: "93.184.216.34", family: 4 }];
    },
    transport: async () => {
      transportCalls++;
      return new Response("ok", { status: 200 });
    },
    audit,
  });

  await assert.rejects(
    gateway.request({
      requestId: "stale-policy",
      url: "https://www.elevate360official.com/",
      method: "GET",
      registryVersion: 2,
    }),
    /gateway_registry_version_mismatch/,
  );
  assert.equal(dnsCalls, 0);
  assert.equal(transportCalls, 0);
});

test("fixture gateway allows approved public target and emits allow audit", async () => {
  const audit = new InMemoryAppendOnlyGatewayAudit();
  const gateway = new LocalFixtureEgressGateway({
    registry,
    dnsResolver: async () => [{ address: "93.184.216.34", family: 4 }],
    transport: async (url, init, records) => {
      assert.equal(url, "https://www.elevate360official.com/");
      assert.equal(init.method, "GET");
      assert.deepEqual(records.map((record) => record.address), ["93.184.216.34"]);
      return new Response("ok", { status: 200 });
    },
    audit,
  });

  const result = await gateway.request({
    requestId: "allowed",
    url: "https://www.elevate360official.com/",
    method: "GET",
    registryVersion: 1,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.auditEvent.decision, "allow");
  assert.equal(result.auditEvent.sequence, 1);
});

test("diagnose worker uses gateway only and cannot execute remediation or production writes", async () => {
  let gatewayCalls = 0;
  const gateway: EgressGateway = {
    name: "test-gateway",
    request: async (input) => {
      gatewayCalls++;
      return {
        response: new Response(null, { status: 204 }),
        auditEvent: Object.freeze({
          sequence: gatewayCalls,
          requestId: input.requestId,
          url: input.url,
          hostname: new URL(input.url).hostname,
          resolvedAddresses: Object.freeze(["93.184.216.34"]),
          decision: "allow",
          reason: "test",
          registryVersion: input.registryVersion,
          immutable: true,
        }),
      };
    },
  };

  const worker = new Phase3DiagnoseWorker({ gateway, registry, maxTargets: 2 });
  const result = await worker.run([
    "https://www.elevate360official.com/",
    "https://www.elevate360official.com/work",
    "https://www.elevate360official.com/pricing",
  ]);

  assert.equal(gatewayCalls, 2);
  assert.equal(result.mode, "diagnose");
  assert.equal(result.readOnly, true);
  assert.equal(result.remediationExecuted, false);
  assert.equal(result.productionWrites, false);
  assert.equal(result.directNetworkAccess, false);
  assert.equal(result.results.length, 2);
});
