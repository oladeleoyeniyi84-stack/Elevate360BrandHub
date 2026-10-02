// Suppress pg library's SSL mode deprecation warning — informational only,
// does not affect security or functionality with Replit's managed DATABASE_URL.
process.on("warning", (w) => {
  if (w.message?.includes("SSL modes") || w.message?.includes("sslmode")) return;
  console.warn(w.name, w.message);
});

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { timingSafeEqual } from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { canonicalRedirect } from "./canonicalRedirect";
import { pool as databasePool } from "./db";
import { trustedWriteOrigin } from "./auth/requestOrigin";
import { dashboardSessionPermitted } from "./auth/dashboardSession";

const app = express();
const httpServer = createServer(app);

// Avoid advertising the framework/version family to unauthenticated clients.
app.disable("x-powered-by");

// trust proxy: 1 trusts exactly one hop from the right of X-Forwarded-For.
// In production: Client → Cloudflare → Replit proxy → Express.
// Rate-limiting uses CF-Connecting-IP (see getClientIp in routes.ts) which
// Cloudflare injects and the client cannot spoof, so the proxy count here
// matters only for req.ip fallback paths (e.g. cookie secure, canonical redirect).
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);

const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
  "frame-src 'self' https://audiomack.com",
  "form-action 'self' https://checkout.stripe.com",
].join("; ");

// Install browser protections before any middleware that can terminate a
// request so 401/429/500 responses receive the same baseline headers.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Content-Security-Policy-Report-Only", cspReportOnly);
  if (process.env.NODE_ENV === "production") {
    // Keep HSTS host-scoped until every legacy subdomain is inventoried and
    // confirmed HTTPS-ready. includeSubDomains can otherwise make abandoned
    // or third-party-managed names unreachable.
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  }
  next();
});

app.use(canonicalRedirect);

const PgSession = ConnectPgSimple(session);
const sessionPool = databasePool;
let requestShutdown: ((signal: string) => void) | null = null;

app.use(
  session({
    name: "e360.sid",
    store: new PgSession({
      pool: sessionPool,
      tableName: "user_sessions",
      // Production schema changes are deployment concerns, never web-process
      // startup side effects.
      createTableIfMissing: process.env.NODE_ENV !== "production",
    }),
    secret: process.env.NODE_ENV === "production"
      ? (process.env.SESSION_SECRET ?? (() => { throw new Error("SESSION_SECRET required in production"); })())
      : (process.env.SESSION_SECRET || process.env.DASHBOARD_PIN || "e360-secret-fallback"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "64kb", parameterLimit: 100 }));

function normalizeDashboardPin(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['\"]+|['\"]+$/g, "");
}

function pinMatches(provided: unknown): boolean {
  const expected = normalizeDashboardPin(process.env.DASHBOARD_PIN);
  const candidate = normalizeDashboardPin(provided);
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  const len = Math.max(a.length, b.length);
  const ap = Buffer.alloc(len);
  const bp = Buffer.alloc(len);
  a.copy(ap);
  b.copy(bp);
  return timingSafeEqual(ap, bp) && a.length === b.length;
}

function extractDashboardLoginPin(req: Request): string | null {
  const body = req.body as any;
  if (typeof body?.pin === "string" && body.pin.trim()) return body.pin;
  if (typeof body?.dashboardPin === "string" && body.dashboardPin.trim()) return body.dashboardPin;
  return null;
}

// Browser writes must be same-origin. Stripe's signed webhook and non-browser
// clients normally omit these browser headers and remain subject to their own
// authentication/signature checks.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path === "/api/stripe/webhook") {
    return next();
  }
  const configuredOrigin = process.env.PUBLIC_BASE_URL || process.env.CANONICAL_HOST ||
    (process.env.NODE_ENV !== "production" ? `${req.protocol}://${req.get("host")}` : undefined);
  const state = req.session as any;
  if (!trustedWriteOrigin({ origin: req.get("origin"), referer: req.get("referer"),
    fetchSite: req.get("sec-fetch-site"), configuredOrigin,
    authenticated: state?.dashboardAuthed === true || !!state?.customerId || !!state?.deliveryOwner })) {
    return res.status(403).json({ message: "Cross-origin request rejected." });
  }
  return next();
});

function getClientIp(req: Request): string {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.trim()) return cf.trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

// PIN authentication is deliberately much tighter than general API limiting.
// Failed header attempts are included so attackers cannot avoid the login
// limiter by trying a different admin URL.
const dashboardAuthAttempts = new Map<string, { count: number; resetAt: number }>();
const DASHBOARD_AUTH_LIMIT = 5;
const DASHBOARD_AUTH_WINDOW_MS = 15 * 60 * 1000;
function consumeDashboardAuthAttempt(req: Request, res: Response): boolean {
  const key = getClientIp(req);
  const now = Date.now();
  const current = dashboardAuthAttempts.get(key);
  if (!current || now >= current.resetAt) {
    dashboardAuthAttempts.set(key, { count: 1, resetAt: now + DASHBOARD_AUTH_WINDOW_MS });
    return true;
  }
  if (current.count >= DASHBOARD_AUTH_LIMIT) {
    res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    res.status(429).json({ message: "Too many authentication attempts. Please try again later." });
    return false;
  }
  current.count++;
  return true;
}

const dashboardAttemptPurge = setInterval(() => {
  const now = Date.now();
  dashboardAuthAttempts.forEach((value, key) => {
    if (now >= value.resetAt) dashboardAuthAttempts.delete(key);
  });
}, DASHBOARD_AUTH_WINDOW_MS);
dashboardAttemptPurge.unref();

// Centralized dashboard login shim registered before route modules. It fixes
// production env formatting issues (accidental whitespace/quotes) and ensures
// every admin surface, including /mesh, uses the same timing-safe PIN matcher.
app.post("/api/dashboard/auth", (req: any, res: Response) => {
  if (!normalizeDashboardPin(process.env.DASHBOARD_PIN)) {
    return res.status(500).json({ message: "Dashboard PIN not configured." });
  }

  if (!consumeDashboardAuthAttempt(req, res)) return;
  const candidate = extractDashboardLoginPin(req);
  if (pinMatches(candidate)) {
    // Rotate the identifier at the privilege boundary to prevent fixation.
    // Preserve an independently authenticated customer identity, but never
    // treat it as founder authorization.
    const deliveryOwner = req.session?.deliveryOwner;
    const customerId = typeof req.session?.customerId === "string" ? req.session.customerId : undefined;
    return req.session.regenerate((regenerateError: unknown) => {
      if (regenerateError) {
        console.error("[dashboardAuth] session regeneration failed");
        return res.status(500).json({ message: "Could not establish dashboard session." });
      }
      req.session.dashboardAuthed = true;
      req.session.dashboardRole = "founder";
      if (deliveryOwner) req.session.deliveryOwner = deliveryOwner;
      if (customerId) req.session.customerId = customerId;
      return req.session.save((error: unknown) => {
        if (error) {
          console.error("[dashboardAuth] session save failed");
          return res.status(500).json({ message: "Could not save dashboard session." });
        }
        return res.json({ ok: true });
      });
    });
  }

  return res.status(401).json({ message: "Invalid PIN." });
});

// Fail-closed prefix guard. This protects every present and future route below
// /api/admin and /api/dashboard, including mounted routers. The founder secret
// is accepted only by the login endpoint; privileged routes require the
// rotated server-side session and never accept it as a reusable bearer token.
app.use((req: any, res, next) => {
  const protectedPath =
    req.path === "/api/admin" ||
    req.path.startsWith("/api/admin/") ||
    req.path === "/api/dashboard" ||
    req.path.startsWith("/api/dashboard/");
  if (!protectedPath || req.path === "/api/dashboard/logout") return next();
  if (dashboardSessionPermitted(req.session, req.method)) return next();
  return res.status(401).json({ message: "Unauthorized" });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // PII-safe: log method/path/status/latency only — never the response body.
      // Response bodies can contain customer emails, names, order metadata, lead info, etc.
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Unknown API routes must remain machine-readable and must never become the
  // SPA's HTML document.
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found." });
  });

  // Phase 69 — start RSS/heap sampling (1/min ring buffer, unref'd timer).
  const { startMemoryMonitor } = await import("./telemetry/memoryMonitor");
  startMemoryMonitor();

  // Seed default consultation offerings if none exist
  const { storage } = await import("./storage");
  await storage.seedDefaultConsultations();

  // Phase 48 — Start automated lead follow-up engine
  const { startFollowupEngine } = await import("./automation/followupEngine");
  await startFollowupEngine();

  // Phase 49 — Start autonomous operation jobs
  const { startAutomationJobs } = await import("./automation");
  await startAutomationJobs();

  // Phase 37 — Stripe init (native SDK only; no Replit connector / managed sync)
  // Webhook URL must be registered manually in the Stripe Dashboard pointing at
  // https://<your-domain>/api/stripe/webhook with STRIPE_WEBHOOK_SECRET in env.
  try {
    const { isStripeConfigured } = await import("./stripeClient");
    if (isStripeConfigured()) {
      console.log("[stripe] initialized (native SDK)");
    } else {
      console.warn("[stripe] STRIPE_SECRET_KEY not set — Stripe features disabled");
    }
  } catch (e: any) {
    console.error("[stripe] init error:", e.message);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = Number(err.status || err.statusCode) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const message =
      safeStatus < 500 && typeof err.message === "string"
        ? err.message
        : "Internal Server Error";

    console.error(`[express] request failed status=${safeStatus} type=${err?.type ?? err?.name ?? "unknown"}`);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(safeStatus).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  // Phase 69 — graceful shutdown. Stop accepting connections, cancel job
  // timers, and close the session DB pool so in-flight work can finish and
  // the process exits cleanly on deploy/restart instead of being SIGKILLed.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal} received — shutting down gracefully`, "shutdown");

    // Hard deadline: force-exit if something hangs (unref'd so it never
    // delays a clean exit).
    const forceExit = setTimeout(() => {
      console.error("[shutdown] timed out after 10s — forcing exit");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    void (async () => {
      try {
        const { stopAllAutomationJobs } = await import("./automation/jobRunner");
        stopAllAutomationJobs();
        const { stopFollowupEngine } = await import("./automation/followupEngine");
        stopFollowupEngine();
        const { stopMemoryMonitor } = await import("./telemetry/memoryMonitor");
        stopMemoryMonitor();
        const { stopRouteTimers } = await import("./routes");
        stopRouteTimers();
        clearInterval(dashboardAttemptPurge);
      } catch (e: any) {
        console.error("[shutdown] stopping jobs failed:", e?.message);
      }
      httpServer.close(() => {
        sessionPool.end().catch(() => undefined).finally(() => {
          log("shutdown complete", "shutdown");
          process.exit(0);
        });
      });
    })();
  };
  requestShutdown = shutdown;
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})().catch((error: unknown) => {
  console.error("[startup] fatal initialization failure", error instanceof Error ? error.message : "unknown error");
  void Promise.allSettled([
    import("./automation/jobRunner").then(({ stopAllAutomationJobs }) => stopAllAutomationJobs()),
    import("./automation/followupEngine").then(({ stopFollowupEngine }) => stopFollowupEngine()),
    import("./telemetry/memoryMonitor").then(({ stopMemoryMonitor }) => stopMemoryMonitor()),
    sessionPool.end(),
  ]).finally(() => process.exit(1));
});

process.on("unhandledRejection", (reason) => {
  // Keep a concise record without dumping provider payloads, tokens, or PII.
  console.error("[process] unhandled rejection:", reason instanceof Error ? reason.message : "non-Error rejection");
  if (requestShutdown) requestShutdown("unhandledRejection");
  else process.exitCode = 1;
});
