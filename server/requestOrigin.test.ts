import test from "node:test";
import assert from "node:assert/strict";
import { trustedWriteOrigin } from "./auth/requestOrigin";

test("cookie-authenticated writes require same-origin evidence", () => {
  const base = { authenticated: true, configuredOrigin: "https://www.elevate360official.com" };
  assert.ok(trustedWriteOrigin({ ...base, origin: base.configuredOrigin }));
  assert.ok(trustedWriteOrigin({ ...base, referer: `${base.configuredOrigin}/dashboard` }));
  assert.equal(trustedWriteOrigin(base), false);
  assert.equal(trustedWriteOrigin({ ...base, origin: "https://evil.example" }), false);
  assert.equal(trustedWriteOrigin({ ...base, origin: "https://health.elevate360official.com", fetchSite: "same-site" }), false);
  assert.equal(trustedWriteOrigin({ ...base, origin: "null" }), false);
  assert.equal(trustedWriteOrigin({ ...base, origin: base.configuredOrigin, fetchSite: "cross-site" }), false);
  assert.ok(trustedWriteOrigin({ ...base, authenticated: false }));
});
