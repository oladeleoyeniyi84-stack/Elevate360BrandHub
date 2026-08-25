import type { Request, Response, NextFunction } from "express";

const devBypass = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  hostname.endsWith(".replit.dev");

function normalizeCanonicalHost(value: string): string | null {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

export function canonicalRedirect(req: Request, res: Response, next: NextFunction) {
  if (!process.env.CANONICAL_HOST) return next();
  const canonicalHost = normalizeCanonicalHost(process.env.CANONICAL_HOST);
  if (!canonicalHost) {
    console.error("[canonical] CANONICAL_HOST is invalid; redirect disabled");
    return next();
  }

  const host = (req.get("host") || "").toLowerCase();
  const hostname = req.hostname.toLowerCase();
  if (!host || devBypass(hostname)) return next();

  const needsHost = host !== canonicalHost;
  const needsHttps = !req.secure;

  if (needsHost || needsHttps) {
    // Parse request-controlled path/query separately, then copy only those
    // components onto the fixed origin. A network-path input such as
    // //attacker.example must never be allowed to replace the canonical host.
    const requestUrl = new URL(req.originalUrl, "http://request.invalid");
    const redirectUrl = new URL(`https://${canonicalHost}`);
    redirectUrl.pathname = requestUrl.pathname;
    redirectUrl.search = requestUrl.search;
    res.status(301);
    res.setHeader("Location", redirectUrl.toString());
    return res.end();
  }

  return next();
}
