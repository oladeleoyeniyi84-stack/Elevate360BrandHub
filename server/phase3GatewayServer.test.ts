import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createPhase3GatewayServer } from "./webops/phase3GatewayServer";
import { InMemoryAppendOnlyGatewayAudit } from "./webops/phase3Audit";

const token = "test-only-strong-shared-token-with-at-least-32-bytes";
const registry = {
  version: 1,
  origins: [{ origin: "https://www.elevate360official.com", enabled: true as const,
    approvedBy: "founder" as const, approvedAt: "2026-10-14T16:00:00Z" }],
};

test("gateway server does not start listening during construction", () => {
  const server = createPhase3GatewayServer({
    registry, sharedToken: token, audit: new InMemoryAppendOnlyGatewayAudit(),
  });
  assert.equal(server.listening, false);
});

test("gateway listener rejects unknown paths and unauthorized requests before egress", async () => {
  // Localhost-only ephemeral fixture. Does not provision infrastructure or reach approved origins.
  const audit = new InMemoryAppendOnlyGatewayAudit();
  const server = createPhase3GatewayServer({ registry, sharedToken: token, audit });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const wrongPath = await fetch(base + "/bad", {
      method: "POST", body: "{}", redirect: "error",
    });
    assert.equal(wrongPath.status, 404);
    const unauthorized = await fetch(base + "/inspect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "unauthorized", url: "https://www.elevate360official.com/", method: "GET", registryVersion: 1 }),
      redirect: "error",
    });
    assert.equal(unauthorized.status, 401);
    assert.equal(audit.snapshot().length, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
