import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Source-contract regression: the public route must stay liveness-only, while
// internal diagnostics must not mistake missing private fields for failures.
test("QA Sentinel does not read secret dependency state from public health response", () => {
  const sentinel = readFileSync(resolve("server/ai/qaSentinel.ts"), "utf8");
  const routes = readFileSync(resolve("server/routes.ts"), "utf8");
  const liveness = routes.slice(routes.indexOf('app.get("/api/health"'), routes.indexOf('app.get("/api/health"') + 400);

  assert.match(liveness, /status: "healthy"/);
  assert.doesNotMatch(liveness, /\bchecks\b\s*:/);

  assert.match(sentinel, /await db\.execute\(sql`SELECT 1`\)/);
  assert.match(sentinel, /getAIStatus\(\)/);
  assert.match(sentinel, /isStripeConfigured\(\)/);
  assert.match(sentinel, /Boolean\(process\.env\.RESEND_API_KEY\)/);

  assert.doesNotMatch(sentinel, /healthPayload\.checks/);
  assert.doesNotMatch(sentinel, /subChecks\.(?:database|ai|resend|stripe)/);
  assert.match(sentinel, /database: \{ ok: databaseOk \}/);
  assert.match(sentinel, /stripe: \{ configured: stripeConfigured \}/);
  assert.match(sentinel, /resend: \{ ok: resendConfigured \}/);
});
