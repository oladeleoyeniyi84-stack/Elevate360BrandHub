import assert from "node:assert/strict";
import test from "node:test";
import { runWorkerInspectionDiagnostic, workerDiagnosticMain } from "./webops/phase3WorkerDiagnostic";

const token = "test-only-strong-shared-token-with-at-least-32-bytes";
const origin = "https://www.elevate360official.com/";

test("worker check succeeds only through validated internal gateway response", async () => {
  let calls = 0;
  const transport = (async (target: RequestInfo | URL, options?: RequestInit) => {
    calls++;
    assert.equal(String(target), "http://webops-egress-gateway:8787/inspect");
    assert.equal(options?.method, "POST");
    assert.equal((options?.headers as Record<string, string>).authorization, `Bearer ${token}`);
    const body = JSON.parse(String(options?.body));
    return Response.json({ status: 204, audit: {
      sequence: 1, requestId: body.requestId, url: body.url,
      hostname: "www.elevate360official.com", resolvedAddresses: ["93.184.216.34"],
      decision: "allow", reason: "test", registryVersion: 1, immutable: true,
    } });
  }) as typeof fetch;
  assert.equal(await runWorkerInspectionDiagnostic(origin, token, transport), true);
  assert.equal(calls, 1);
});

test("worker check fails without fallback on gateway outage", async () => {
  let calls = 0;
  const transport = (async () => { calls++; throw Error("offline"); }) as typeof fetch;
  assert.equal(await runWorkerInspectionDiagnostic(origin, token, transport), false);
  assert.equal(calls, 1);
});

test("worker check rejects unapproved origin before internal network request", async () => {
  let calls = 0;
  const transport = (async () => { calls++; throw Error("unexpected"); }) as typeof fetch;
  assert.equal(await runWorkerInspectionDiagnostic("https://example.com/", token, transport), false);
  assert.equal(calls, 0);
});

test("CLI fails closed without valid argument and private secret file", async () => {
  assert.equal(await workerDiagnosticMain([], {}), 2);
  assert.equal(await workerDiagnosticMain([origin], {}), 2);
  assert.equal(await workerDiagnosticMain([origin], { WEBOPS_GATEWAY_TOKEN_FILE: "relative/path" }), 2);
});
