// Stripe sandbox webhook verification and payload validation.
// This file intentionally has no Stripe API calls, database writes, or production imports.
import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_BODY_BYTES = 256 * 1024;
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function verifySandboxSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now()/1000)) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES)
    throw new Error("Invalid raw webhook body");
  if (typeof secret !== "string" || !/^whsec_[A-Za-z0-9_]+$/.test(secret))
    throw new Error("Sandbox webhook signing secret is not configured");
  if (typeof header !== "string" || header.length > 2048) throw new Error("Invalid signature header");

  const parts = header.split(",");
  let timestamp = null;
  const signatures = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (/^t=\d+$/.test(trimmed)) timestamp = Number(trimmed.slice(2));
    if (/^v1=[a-f0-9]{64}$/i.test(trimmed)) signatures.push(trimmed.slice(3).toLowerCase());
  }
  if (!Number.isSafeInteger(timestamp) || signatures.length === 0) throw new Error("Signature missing timestamp or v1");
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS)
    throw new Error("Signature timestamp expired or from future");

  const mac = createHmac("sha256", secret).update(String(timestamp)).update(".").update(rawBody).digest();
  const ok = signatures.some(sig => {
    const candidate = Buffer.from(sig, "hex");
    return candidate.length === mac.length && timingSafeEqual(candidate, mac);
  });
  if (!ok) throw new Error("Webhook signature verification failed");
  return true;
}

export function parseSandboxEvent(rawBody) {
  let event;
  try { event = JSON.parse(rawBody.toString("utf8")); }
  catch { throw new Error("Malformed JSON event"); }
  if (!event || typeof event !== "object" || event.livemode !== false)
    throw new Error("Live-mode or missing test-mode flag rejected");
  if (!/^evt_[A-Za-z0-9_]{3,180}$/.test(event.id ?? ""))
    throw new Error("Invalid Stripe event id");
  if (typeof event.type !== "string" || !/^[a-z0-9_.]{3,130}$/.test(event.type))
    throw new Error("Invalid event type");
  return { id: event.id, type: event.type, livemode: false };
}

export function sandboxAck(isDuplicate) {
  return { received: true, sandbox: true, duplicate: Boolean(isDuplicate) };
}
