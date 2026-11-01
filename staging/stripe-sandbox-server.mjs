/**
 * Isolated Stripe TEST-mode webhook receiver.
 * Deploy from staging branch ONLY, never from production main.
 * No customer-facing pages, Stripe API keys, email integration or scheduled jobs.
 *
 * Required Render env:
 *   STAGING_SANDBOX_ONLY=true
 *   STAGING_DATABASE_NAME=<separate Render Postgres database name>
 *   DATABASE_URL=<that separate database's INTERNAL URL>
 *   STRIPE_SANDBOX_WEBHOOK_SECRET=<Stripe sandbox destination whsec_...>
 */
import http from "node:http";
import pg from "pg";
import {
  MAX_BODY_BYTES, verifySandboxSignature, parseSandboxEvent, sandboxAck,
} from "./stripeWebhookCore.mjs";

if (process.env.STAGING_SANDBOX_ONLY !== "true") {
  console.error("[staging] sandbox-only startup guard not configured");
  process.exit(1);
}
const port = Number.parseInt(process.env.PORT || "10000", 10);
if (!Number.isInteger(port) || port < 1024 || port > 65535) process.exit(1);
const expectedDb = process.env.STAGING_DATABASE_NAME;
const dbUrl = process.env.DATABASE_URL;
// No production credential fallback, no shared environment groups.
const pool = expectedDb && dbUrl ? new pg.Pool({
  connectionString: dbUrl,
  max: 2,
  connectionTimeoutMillis: 4000,
  idleTimeoutMillis: 10000,
}) : null;
pool?.on("error", () => console.warn("[staging] database connection was interrupted"));
let initPromise;
async function dbReady() {
  if (!pool || !expectedDb || !/^elevate360_stripe_sandbox_[a-z0-9_]+$/.test(expectedDb))
    throw new Error("Isolated sandbox DB configuration required");
  if (!initPromise) {
    initPromise = (async () => {
      const name = await pool.query("SELECT current_database() AS name");
      if (name.rows[0]?.name !== expectedDb) throw new Error("Refusing non-sandbox database");
      await pool.query(`CREATE TABLE IF NOT EXISTS sandbox_stripe_events (
        id varchar(200) PRIMARY KEY,
        event_type varchar(130) NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now()
      )`);
    })().catch(error => {initPromise = undefined; throw error;});
  }
  await initPromise;
  return pool;
}
function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer",
    "X-Robots-Tag":"noindex, nofollow",
  });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, {status:"ok",mode:"stripe-test-only"});
  }
  if (req.method === "GET" && req.url === "/ready") {
    try {
      await dbReady();
      if (!/^whsec_[A-Za-z0-9_]+$/.test(process.env.STRIPE_SANDBOX_WEBHOOK_SECRET || ""))
        throw new Error("Signing secret missing");
      return json(res, 200, {ready:true,mode:"stripe-test-only"});
    } catch { return json(res, 503, {ready:false,mode:"stripe-test-only"}); }
  }
  if (req.method === "GET" && req.url === "/robots.txt") {
    res.writeHead(200, {"Content-Type":"text/plain","Cache-Control":"no-store"});
    return res.end("User-agent: *\nDisallow: /\n");
  }
  if (req.method !== "POST" || req.url !== "/webhooks/stripe/test") {
    return json(res, 404, {error:"Not found"});
  }
  if (!(req.headers["content-type"] || "").startsWith("application/json")) {
    return json(res, 415, {error:"Expected application/json"});
  }
  if (!process.env.STRIPE_SANDBOX_WEBHOOK_SECRET) {
    return json(res, 503, {error:"Sandbox destination has not been configured"});
  }
  let event;
  try {
    const rawBody = await readBody(req);
    verifySandboxSignature(rawBody, req.headers["stripe-signature"], process.env.STRIPE_SANDBOX_WEBHOOK_SECRET);
    event = parseSandboxEvent(rawBody);
  } catch {
    return json(res, 400, {error:"Invalid sandbox webhook"});
  }
  try {
    const database = await dbReady();
    const result = await database.query(
      "INSERT INTO sandbox_stripe_events (id,event_type) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING RETURNING id",
      [event.id,event.type],
    );
    const duplicate = result.rowCount === 0;
    console.log("[staging] signed test event", {type:event.type,duplicate});
    return json(res, 200, sandboxAck(duplicate));
  } catch {
    console.error("[staging] isolated database unavailable");
    return json(res, 503, {error:"Sandbox storage unavailable; retry"});
  }
});
server.listen(port,"0.0.0.0",() => console.log("[staging] test-only webhook listening"));
async function close() {
  server.close();
  if (pool) await pool.end().catch(() => {});
}
process.on("SIGTERM",() => {close().finally(() => process.exit(0));});
process.on("SIGINT",() => {close().finally(() => process.exit(0));});
