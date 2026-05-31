// Phase 68A — Customer authentication (public end-users).
// Completely separate from the founder PIN dashboard (requireDashboardAuth).
// Uses the shared express-session store; customer identity lives on
// req.session.customerId. Passwords hashed with scrypt (no external dep).
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt);

const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hashHex] = stored.split(":");
  const hashBuf = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

export function getCustomerId(req: any): string | null {
  const id = req.session?.customerId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// Middleware: gate routes that require a signed-in customer.
// Distinct from requireDashboardAuth (founder PIN) — never mixes the two.
export function requireCustomerAuth(req: any, res: any, next: any) {
  if (!getCustomerId(req)) {
    return res.status(401).json({ message: "Sign in required" });
  }
  next();
}
