import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { applySeoHead } from "./seo/injectHead";
import { isKnownSpaRoute } from "./seo/spaRoutes";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  const indexPath = path.resolve(distPath, "index.html");
  const template = fs.readFileSync(indexPath, "utf-8");

  // fall through to index.html if the file doesn't exist —
  // with per-route server-delivered <head> metadata (Phase 72.4.1).
  app.use("/{*path}", async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path === "/api" || req.path.startsWith("/api/")) return next();
    try {
      if (!(await isKnownSpaRoute(req.originalUrl))) return res.sendStatus(404);
      const html = await applySeoHead(template, req.originalUrl);
      res.status(200).type("html").send(html);
    } catch (error) {
      console.warn("[seo] head injection failed; serving base document");
      res.status(200).type("html").send(template);
    }
  });
}
