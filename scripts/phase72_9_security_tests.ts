import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import express from "express";
import session from "express-session";
import { persistInitiatedOrderOrExpire } from "../server/billing/checkoutSafety";
import {
  initializeConciergeSession,
  scopeConciergeSessionId,
} from "../server/ai/promptSecurity";

const indexSource = readFileSync(new URL("../server/index.ts", import.meta.url), "utf8");
const routesSource = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
const packageLock = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
) as { packages?: Record<string, { version?: string }> };

const failures: string[] = [];

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

check("security headers run before founder authentication responses", () => {
  const middleware = indexSource.indexOf('res.setHeader("X-Content-Type-Options"');
  const authRoute = indexSource.indexOf('app.post("/api/dashboard/auth"');
  assert.ok(middleware >= 0 && authRoute >= 0 && middleware < authRoute);
});

check("CSP is staged in report-only mode", () => {
  assert.match(indexSource, /Content-Security-Policy-Report-Only/);
});

check("production HSTS is configured", () => {
  assert.match(indexSource, /Strict-Transport-Security/);
  assert.doesNotMatch(indexSource, /Strict-Transport-Security[^\n]*includeSubDomains/);
});

check("founder secret is accepted only by the login endpoint", () => {
  assert.doesNotMatch(indexSource, /req\.headers\["x-dashboard-pin"\]/);
  assert.doesNotMatch(indexSource, /req\.headers\.authorization/);
  assert.doesNotMatch(routesSource, /x-dashboard-pin/);
  assert.doesNotMatch(routesSource, /dashboardRequestAuthed/);
});

check("browser writes reject hostile origins", () => {
  assert.match(indexSource, /sec-fetch-site/);
  assert.match(indexSource, /Cross-origin request rejected/);
  assert.match(indexSource, /req\.path === "\/api\/stripe\/webhook"/);
});

check("public health response is minimal", () => {
  const start = routesSource.indexOf('app.get("/api/health"');
  const end = routesSource.indexOf("// Phase 45", start);
  assert.ok(start >= 0 && end > start);
  const route = routesSource.slice(start, end);
  assert.doesNotMatch(route, /getMemoryStats|getAIStatus|checks|RESEND_API_KEY|STRIPE_SECRET_KEY/);
  assert.match(route, /status:\s*"healthy"/);
});

check("offer acceptance is scoped to the server session", () => {
  const start = routesSource.indexOf('app.post("/api/checkout/offer-accepted"');
  const end = routesSource.indexOf("// Phase 39", start);
  assert.ok(start >= 0 && end > start);
  const route = routesSource.slice(start, end);
  assert.match(route, /scopeConciergeSessionId/);
  assert.match(route, /req\.sessionID/);
  assert.match(route, /conversation\.recommendedOffer !== parsed\.data\.offerSlug/);
  assert.doesNotMatch(route, /markOfferAccepted\(sessionId,/);
});

const isolationSecret = randomBytes(32).toString("hex");
assert.notEqual(
  scopeConciergeSessionId("session-a", "client-visible-id", isolationSecret),
  scopeConciergeSessionId("session-b", "client-visible-id", isolationSecret),
  "the same browser-provided ID must resolve to different records across sessions",
);

check("anonymous chat explicitly persists its Express session", () => {
  const start = routesSource.indexOf('app.post("/api/chat"');
  const end = routesSource.indexOf("// Phase 68A", start);
  assert.ok(start >= 0 && end > start);
  const route = routesSource.slice(start, end);
  assert.match(route, /initializeConciergeSession\(\(req as any\)\.session\)/);
});

const lifecycleApp = express();
lifecycleApp.use(session({
  secret: isolationSecret,
  resave: false,
  saveUninitialized: false,
}));
lifecycleApp.get("/chat", (req, res) => {
  initializeConciergeSession(req.session);
  res.json({ sessionId: req.sessionID });
});
lifecycleApp.get("/return", (req, res) => {
  res.json({ sessionId: req.sessionID });
});

const lifecycleServer = await new Promise<ReturnType<typeof lifecycleApp.listen>>((resolve) => {
  const server = lifecycleApp.listen(0, "127.0.0.1", () => resolve(server));
});
try {
  const address = lifecycleServer.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  const chatResponse = await fetch(`${origin}/chat`);
  const cookie = chatResponse.headers.get("set-cookie");
  const chatBody = await chatResponse.json() as { sessionId: string };
  assert.ok(cookie, "initialized anonymous chat must issue a session cookie");

  const returnResponse = await fetch(`${origin}/return`, {
    headers: { cookie: cookie.split(";")[0] },
  });
  const returnBody = await returnResponse.json() as { sessionId: string };
  assert.equal(
    returnBody.sessionId,
    chatBody.sessionId,
    "top-level return with the cookie must preserve the conversation namespace",
  );
} finally {
  await new Promise<void>((resolve, reject) => {
    lifecycleServer.close((error) => error ? reject(error) : resolve());
  });
}

check("checkout persistence failure expires inaccessible Stripe sessions", () => {
  const matches = routesSource.match(/persistInitiatedOrderOrExpire/g) ?? [];
  assert.ok(matches.length >= 4, `expected helper import plus three guarded checkout flows, found ${matches.length}`);
});

check("public order and delivery responses are bounded", () => {
  const orderStart = routesSource.indexOf('app.get("/api/orders/status"');
  const deliveryStart = routesSource.indexOf('app.get("/api/marketplace/delivery"');
  const deliveryEnd = routesSource.indexOf('app.get("/api/admin/marketplace"', deliveryStart);
  assert.ok(orderStart >= 0 && deliveryStart > orderStart && deliveryEnd > deliveryStart);
  const orderRoute = routesSource.slice(orderStart, deliveryStart);
  const deliveryRoute = routesSource.slice(deliveryStart, deliveryEnd);
  assert.match(orderRoute, /rateLimit\(30, 60\)/);
  assert.match(deliveryRoute, /rateLimit\(20, 60\)/);
  assert.match(deliveryRoute, /Cache-Control", "no-store/);
  assert.doesNotMatch(deliveryRoute, /setOrderFulfillment/);
});

let expirationCalled = false;
const persistenceError = new Error("synthetic persistence failure");
await assert.rejects(
  persistInitiatedOrderOrExpire(
    async () => {
      throw persistenceError;
    },
    async () => {
      expirationCalled = true;
    },
  ),
  (error) => error === persistenceError,
);
assert.equal(expirationCalled, true, "persistence failure must expire the unexposed Checkout session");

await assert.rejects(
  persistInitiatedOrderOrExpire(
    async () => {
      throw persistenceError;
    },
    async () => {
      throw new Error("synthetic Stripe cleanup failure");
    },
  ),
  (error) => error === persistenceError,
  "cleanup failure must not replace the authoritative persistence error",
);

check("patched browserslist version is locked", () => {
  const version = packageLock.packages?.["node_modules/browserslist"]?.version ?? "0.0.0";
  const [major, minor, patch] = version.split(".").map(Number);
  assert.ok(
    major > 4 || (major === 4 && (minor > 28 || (minor === 28 && patch >= 7))),
    `found vulnerable browserslist ${version}`,
  );
});

if (failures.length > 0) {
  throw new Error(`Phase 72.9 security assurance failed ${failures.length} check(s): ${failures.join(", ")}`);
}

console.log("Phase 72.9 security assurance tests passed.");
