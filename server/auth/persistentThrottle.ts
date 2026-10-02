import { createHmac } from "node:crypto";
import type { RequestHandler } from "express";

export interface ThrottleDatabase {
  query(sql: string, values: any[]): Promise<{ rows: any[] }>;
}

// Reuse the existing managed session store and its expiry cleanup. No schema
// bootstrap or migration is performed by web processes. A single upsert locks
// each bucket, so quotas survive restarts and are shared by all instances.
export const AUTHENTICATION_BUCKET_SQL = `
INSERT INTO user_sessions (sid, sess, expire)
VALUES ($1, json_build_object('authAttempts', 1), CURRENT_TIMESTAMP + ($2::int * INTERVAL '1 second'))
ON CONFLICT (sid) DO UPDATE SET
  sess = json_build_object('authAttempts', CASE
    WHEN user_sessions.expire <= CURRENT_TIMESTAMP THEN 1
    ELSE LEAST(COALESCE((user_sessions.sess->>'authAttempts')::int, 0) + 1, $3::int + 1)
  END),
  expire = CASE WHEN user_sessions.expire <= CURRENT_TIMESTAMP
    THEN CURRENT_TIMESTAMP + ($2::int * INTERVAL '1 second') ELSE user_sessions.expire END
RETURNING (sess->>'authAttempts')::int AS attempts,
  GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expire - CURRENT_TIMESTAMP))))::int AS retry_after
`;

export async function consumeAuthenticationAttempt(database: ThrottleDatabase, secret: string,
  scope: string, identity: string, maximum: number, windowSeconds: number) {
  if (!secret || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 1000 ||
      !Number.isSafeInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86400) {
    throw new Error("Invalid authentication throttle configuration");
  }
  const hash = createHmac("sha256", secret).update(`${scope}\0${identity}`).digest("hex");
  const result = await database.query(AUTHENTICATION_BUCKET_SQL, [`throttle:${hash}`, windowSeconds, maximum]);
  const row = result.rows[0];
  if (!row || !Number.isInteger(row.attempts) || !Number.isInteger(row.retry_after)) {
    throw new Error("Authentication throttle unavailable");
  }
  return { allowed: row.attempts <= maximum, retryAfter: row.retry_after };
}

export function persistentLoginLimit(database: ThrottleDatabase, scope: string,
  maximum: number, windowSeconds: number, accountLimit = false): RequestHandler {
  return async (req, res, next) => {
    try {
      const secret = process.env.SESSION_SECRET;
      if (!secret) throw new Error("Session secret unavailable");
      // Express resolves the configured trusted proxy hop; do not trust a
      // client-supplied Cloudflare header on the public Render origin.
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const ipResult = await consumeAuthenticationAttempt(database, secret, `${scope}:ip`, ip, maximum, windowSeconds);
      // Normalize exactly as customer authentication does. Hashing prevents
      // email addresses and network identifiers from entering the bucket rows.
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      if (!ipResult.allowed) {
        res.setHeader("Retry-After", String(ipResult.retryAfter));
        return void res.status(429).json({ message: "Too many authentication attempts. Please try again later." });
      }
      const accountResult = accountLimit && email
        ? await consumeAuthenticationAttempt(database, secret, `${scope}:account`, email, maximum, windowSeconds)
        : { allowed: true, retryAfter: 0 };
      if (!accountResult.allowed) {
        res.setHeader("Retry-After", String(Math.max(ipResult.retryAfter, accountResult.retryAfter)));
        return void res.status(429).json({ message: "Too many authentication attempts. Please try again later." });
      }
      next();
    } catch {
      // Authentication must not silently become unthrottled during DB failure.
      res.setHeader("Retry-After", "30");
      res.status(503).json({ message: "Authentication temporarily unavailable. Please try again later." });
    }
  };
}
