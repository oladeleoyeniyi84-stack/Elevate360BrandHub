import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
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

  // Phase 37 — Stripe init (migrations → sync → webhook)
  try {
    const { runMigrations } = await import("stripe-replit-sync");
    const { getStripeSync } = await import("./stripeClient");
    await runMigrations({ databaseUrl: process.env.DATABASE_URL!, schema: "stripe" } as any);
    const stripeSync = await getStripeSync();
    const primaryDomain = (process.env.REPLIT_DOMAINS ?? "").split(",")[0];
    const CANONICAL = "www.elevate360official.com";
    const isProduction = primaryDomain === CANONICAL || process.env.NODE_ENV === "production";
    if (isProduction) {
      const webhookBase = `https://${primaryDomain}`;
      await stripeSync.findOrCreateManagedWebhook(`${webhookBase}/api/stripe/webhook`).catch((e: Error) =>
        console.error("[stripe] webhook setup:", e.message)
      );
    } else {
      console.log("[stripe] webhook registration skipped in dev (non-canonical domain)");
    }
    stripeSync.syncBackfill().catch((e: Error) => console.error("[stripe] syncBackfill:", e.message));
    console.log("[stripe] initialized");
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
