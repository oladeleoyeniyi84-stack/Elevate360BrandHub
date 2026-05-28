// Suppress pg library's SSL mode deprecation warning — informational only,
// does not affect security or functionality with Replit's managed DATABASE_URL.
process.on("warning", (w) => {
  if (w.message?.includes("SSL modes") || w.message?.includes("sslmode")) return;
  console.warn(w.name, w.message);
});

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { timingSafeEqual } from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { canonicalRedirect } from "./canonicalRedirect";

const app = express();
const httpServer = createServer(app);

// trust proxy: 1 trusts exactly one hop from the right of X-Forwarded-For.
// In production: Client → Cloudflare → Replit proxy → Express.
// Rate-limiting uses CF-Connecting-IP (see getClientIp in routes.ts) which
// Cloudflare injects and the client cannot spoof, so the proxy count here
// matters only for req.ip fallback paths (e.g. cookie secure, canonical redirect).
app.set("trust proxy", 1);
app.use(canonicalRedirect);

const PgSession = ConnectPgSimple(session);
const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      tableName: "user_sessions",
      createTableIfMissing: true,
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
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

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

function extractDashboardPin(req: Request): string | null {
  const headerPin = req.headers["x-dashboard-pin"];
  if (typeof headerPin === "string" && headerPin.trim()) return headerPin;

  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const body = req.body as any;
  if (typeof body?.pin === "string" && body.pin.trim()) return body.pin;
  if (typeof body?.dashboardPin === "string" && body.dashboardPin.trim()) return body.dashboardPin;
  return null;
}

// Centralized dashboard login shim registered before route modules. It fixes
// production env formatting issues (accidental whitespace/quotes) and ensures
// every admin surface, including /mesh, uses the same timing-safe PIN matcher.
app.post("/api/dashboard/auth", (req: any, res: Response) => {
  if (!normalizeDashboardPin(process.env.DASHBOARD_PIN)) {
    return res.status(500).json({ message: "Dashboard PIN not configured." });
  }

  const candidate = extractDashboardPin(req);
  if (pinMatches(candidate)) {
    req.session.dashboardAuthed = true;
    return req.session.save((error: unknown) => {
      if (error) {
        console.error("[dashboardAuth] session save failed");
        return res.status(500).json({ message: "Could not save dashboard session." });
      }
      return res.json({ ok: true });
    });
  }

  return res.status(401).json({ message: "Invalid PIN." });
});

// Pre-authorize protected admin APIs before server/routes.ts legacy guards run.
// routes.ts first trusts req.session.dashboardAuthed; this normalized middleware
// sets that flag for any valid x-dashboard-pin/Bearer/body PIN so all admin
// surfaces share one production-safe matcher without exposing secrets.
app.use((req: any, _res, next) => {
  if ((req.path.startsWith("/api/admin") || req.path.startsWith("/api/dashboard")) && pinMatches(extractDashboardPin(req))) {
    req.session.dashboardAuthed = true;
  }
  next();
});

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
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

  // Seed default consultation offerings if none exist
  const { storage } = await import("./storage");
  storage.seedDefaultConsultations().catch((e) => console.error("[seed] consultations:", e));

  // Phase 48 — Start automated lead follow-up engine
  const { startFollowupEngine } = await import("./automation/followupEngine");
  startFollowupEngine().catch((e: Error) => console.error("[followupEngine] start error:", e.message));

  // Phase 49 — Start autonomous operation jobs
  const { startAutomationJobs } = await import("./automation");
  startAutomationJobs().catch((e: Error) => console.error("[automationJobs] start error:", e.message));

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
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
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
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
