import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function initializeDeliveryOwner(session: { deliveryOwner?: string }): string {
  return session.deliveryOwner ??= randomBytes(32).toString("hex");
}

export function deliveryOwnerHash(owner: string): string {
  return createHash("sha256").update(owner).digest("hex");
}

export function ownsDelivery(owner: unknown, storedHash: unknown): boolean {
  if (typeof owner !== "string" || !/^[a-f0-9]{64}$/.test(owner) ||
      typeof storedHash !== "string" || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(deliveryOwnerHash(owner)), Buffer.from(storedHash));
}

export function signDeliveryToken(sessionId: string, owner: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ sessionId, owner: deliveryOwnerHash(owner), expires: now + 15 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function validDeliveryToken(token: unknown, sessionId: string, owner: unknown, secret: string, now = Date.now()): boolean {
  if (typeof token !== "string" || token.length > 2048 || typeof owner !== "string") return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.sessionId === sessionId && data.owner === deliveryOwnerHash(owner) &&
      Number.isSafeInteger(data.expires) && now < data.expires && data.expires <= now + 15 * 60_000;
  } catch { return false; }
}
