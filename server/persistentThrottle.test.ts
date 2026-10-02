import test from "node:test";
import assert from "node:assert/strict";
import { consumeAuthenticationAttempt, persistentLoginLimit } from "./auth/persistentThrottle";

test("authentication buckets use opaque keys and parameterized quotas", async () => {
  let parameters: any[] = [];
  const database = { query: async (_sql: string, values: any[]) => {
    parameters = values; return { rows: [{ attempts: 6, retry_after: 900 }] };
  } };
  const result = await consumeAuthenticationAttempt(database, "test-secret", "customer", "person@example.test", 5, 900);
  assert.equal(result.allowed, false);
  assert.match(parameters[0], /^throttle:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(parameters).includes("person@example.test"), false);
  assert.deepEqual(parameters.slice(1), [900, 5]);
});

test("login fails closed when its persistent limiter is unavailable", async () => {
  const original = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-secret";
  let status = 0; let nextCalled = false;
  const response: any = { setHeader() {}, status(code: number) { status = code; return this; }, json() {} };
  try {
    const middleware = persistentLoginLimit({ query: async () => { throw new Error("offline"); } }, "founder", 5, 900);
    await middleware({ get: () => undefined, ip: "127.0.0.1", socket: {}, body: {} } as any,
      response, () => { nextCalled = true; });
    assert.equal(status, 503);
    assert.equal(nextCalled, false);
  } finally {
    if (original === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = original;
  }
});

 test("spoofed Cloudflare headers cannot change the login bucket", async () => {
  const original = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-secret";
  const keys: string[] = [];
  const database = { query: async (_sql: string, values: any[]) => {
    keys.push(values[0]); return { rows: [{ attempts: 1, retry_after: 900 }] };
  } };
  try {
    const middleware = persistentLoginLimit(database, "founder", 5, 900);
    for (const spoof of ["1.2.3.4", "5.6.7.8"]) {
      await middleware({ get: () => spoof, ip: "192.0.2.1", socket: {}, body: {} } as any, {} as any, () => {});
    }
    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
  } finally {
    if (original === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = original;
  }
});
