// Sprint 71.1 — Context-aware AI Concierge (client entry point).
// The actual data lives in shared/conciergeContext.ts so the SERVER can look up
// page knowledge itself instead of trusting client-sent prompt text. This file
// is the client-facing module: re-exports + client-only helpers.

import {
  CONCIERGE_PAGE_CONTEXTS,
  getConciergePageContext,
  resolveConciergePagePath,
  type ConciergeLink,
  type ConciergePageContext,
} from "@shared/conciergeContext";

export {
  CONCIERGE_PAGE_CONTEXTS,
  getConciergePageContext,
  resolveConciergePagePath,
  type ConciergeLink,
  type ConciergePageContext,
};

/** Wire payload sent with every /api/chat request. */
export interface ConciergePagePayload {
  page: string;
  pageTitle?: string;
  section?: string;
  product?: string;
  visitorType: "anonymous" | "customer";
}

/**
 * Build the pageContext payload for the current location. Always returns a
 * payload (unknown pages still send their sanitized path so the server can
 * mention where the visitor is).
 */
export function buildConciergePagePayload(
  path: string,
  isAuthenticated: boolean
): ConciergePagePayload {
  const entry = getConciergePageContext(path);
  return {
    page: path.split(/[?#]/)[0].slice(0, 200),
    ...(entry && {
      pageTitle: entry.pageTitle,
      section: entry.section,
      ...(entry.product && { product: entry.product }),
    }),
    visitorType: isAuthenticated ? "customer" : "anonymous",
  };
}

/** Page-aware greeting for the default concierge mode; null → caller uses the mode intro. */
export function getConciergeGreeting(path: string): string | null {
  return getConciergePageContext(path)?.greeting ?? null;
}

/**
 * Founder/admin routes where the public concierge must NOT render.
 * Everything else (including unknown public pages like /thank-you) shows it.
 */
const CONCIERGE_HIDDEN_ROUTE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/ops",
  "/growth",
  "/experiments",
  "/personalization",
  "/mesh",
  "/command-grid",
  "/orchestrator",
  "/revenue",
  "/executive",
  "/content-factory",
  "/authority",
  "/marketplace-admin",
  "/memory-explorer",
  "/founder-intelligence",
  "/revenue-intelligence",
  "/growth-automation",
  "/cognitive-os",
];

export function isConciergeHiddenRoute(path: string): boolean {
  const clean = path.split(/[?#]/)[0].toLowerCase();
  return CONCIERGE_HIDDEN_ROUTE_PREFIXES.some(
    (p) => clean === p || clean.startsWith(`${p}/`)
  );
}
