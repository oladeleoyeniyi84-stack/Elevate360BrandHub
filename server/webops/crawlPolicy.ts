import { isIP } from "node:net";

export type CrawlRejectionReason =
  | "invalid_url"
  | "https_required"
  | "credentials_forbidden"
  | "unsafe_hostname"
  | "origin_not_allowlisted";

export type CrawlTargetDecision =
  | { allowed: true; url: string; origin: string }
  | { allowed: false; reason: CrawlRejectionReason };

function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    !host ||
    isIP(host) !== 0 ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  );
}

/**
 * Normalize a deliberately small, exact-origin allowlist.
 * Only public HTTPS origins without credentials, paths, queries, fragments,
 * IP literals, or nonstandard ports are accepted.
 */
export function normalizeApprovedOrigins(origins: readonly string[]): Set<string> {
  const approved = new Set<string>();

  for (const rawOrigin of origins) {
    let url: URL;
    try {
      url = new URL(rawOrigin);
    } catch {
      throw new Error("Invalid WebOps origin configuration.");
    }

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash ||
      (url.port !== "" && url.port !== "443") ||
      isUnsafeHostname(url.hostname)
    ) {
      throw new Error("WebOps origins must be public HTTPS origins without paths or credentials.");
    }

    approved.add(url.origin);
  }

  if (approved.size === 0) {
    throw new Error("At least one approved WebOps origin is required.");
  }

  return approved;
}

/**
 * Resolve an absolute or relative URL and enforce the exact approved origin.
 * URL fragments are removed so the same page is not crawled repeatedly.
 */
export function validateCrawlTarget(
  rawTarget: string,
  approvedOrigins: ReadonlySet<string>,
  baseUrl?: string,
): CrawlTargetDecision {
  let url: URL;
  try {
    url = baseUrl ? new URL(rawTarget, baseUrl) : new URL(rawTarget);
  } catch {
    return { allowed: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { allowed: false, reason: "https_required" };
  }

  if (url.username || url.password) {
    return { allowed: false, reason: "credentials_forbidden" };
  }

  if (
    isUnsafeHostname(url.hostname) ||
    (url.port !== "" && url.port !== "443")
  ) {
    return { allowed: false, reason: "unsafe_hostname" };
  }

  if (!approvedOrigins.has(url.origin)) {
    return { allowed: false, reason: "origin_not_allowlisted" };
  }

  url.hash = "";
  return { allowed: true, url: url.toString(), origin: url.origin };
}
