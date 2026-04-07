import type { Request, Response, NextFunction } from "express";

const devBypass = (host: string) =>
  host.includes("localhost") ||
  host.startsWith("127.0.0.1") ||
  host.endsWith(".replit.dev");

export function canonicalRedirect(req: Request, res: Response, next: NextFunction) {
  const canonicalHost = process.env.CANONICAL_HOST;
  if (!canonicalHost) return next();

  const host = (req.headers.host || "").toLowerCase();
  if (!host || devBypass(host)) return next();

  const proto = (req.headers["x-forwarded-proto"] || "http").toString().split(",")[0].trim();
  const isHttps = proto === "https";

  const url = new URL(`${proto}://${host}${req.originalUrl}`);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  const needsHost = host !== canonicalHost;
  const needsHttps = !isHttps;

  if (needsHost || needsHttps) {
    url.host = canonicalHost;
    url.protocol = "https:";
    return res.redirect(301, url.toString());
  }

  return next();
}
