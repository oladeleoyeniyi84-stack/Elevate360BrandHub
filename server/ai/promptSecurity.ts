import { createHmac } from "node:crypto";

const MAX_CONTEXT_CHARS = 8_000;

/** Treat recalled/knowledge text as inert data and prevent delimiter breakout. */
export function wrapUntrustedPromptData(label: string, value: string, maxChars = MAX_CONTEXT_CHARS): string {
  const safeLabel = label.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "data";
  const bounded = value
    .replace(/\0/g, "")
    .replace(/<\/?untrusted-[^>]*>/gi, "[removed delimiter]")
    .slice(0, Math.max(0, maxChars));
  return `<untrusted-${safeLabel}>\n${bounded}\n</untrusted-${safeLabel}>`;
}

/**
 * Namespaces a browser-provided conversation id to the current Express session.
 * A guessed id from another cookie therefore maps to a different DB/cache key.
 */
export function scopeConciergeSessionId(
  expressSessionId: string,
  clientSessionId: string,
  secret: string,
): string {
  if (!expressSessionId || !clientSessionId || !secret) {
    throw new Error("Concierge session isolation is not configured");
  }
  return createHmac("sha256", secret)
    .update(expressSessionId)
    .update("\0")
    .update(clientSessionId)
    .digest("hex");
}