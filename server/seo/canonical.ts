// Phase 72.4.1 — single canonical-URL policy for the whole app.
//
// Canonical origin: https://www.elevate360official.com (https, www).
// One utility shared by server-delivered <head> metadata, JSON-LD,
// sitemap.xml, llms.txt and the SEO audit, so they can never disagree.

// Host/protocol canonicalization (http→https, naked→www, trailing slash) is
// already enforced by server/canonicalRedirect.ts via the CANONICAL_HOST env
// var — this module only defines the URL policy shared by head metadata,
// JSON-LD, sitemap, llms.txt and the SEO audit.

export const CANONICAL_ORIGIN = "https://www.elevate360official.com";

/**
 * Normalize a request path into its canonical path form:
 * - strips query strings, fragments and (with them) tracking parameters
 * - collapses duplicate slashes
 * - removes trailing slashes (except the home page "/")
 * - preserves the route path itself (never canonicalizes to the homepage)
 */
export function canonicalPath(rawPath: string): string {
  let p = (rawPath || "/").split(/[?#]/)[0];
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

/** Absolute canonical URL for a route path. Home page keeps its trailing slash. */
export function canonicalUrl(rawPath: string): string {
  const p = canonicalPath(rawPath);
  return p === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${p}`;
}
