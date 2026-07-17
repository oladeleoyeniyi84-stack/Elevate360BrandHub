---
name: SPA fallback false 200s
description: How to diagnose "API returns 200 with empty/HTML body" in this project
---
Any unregistered `/api/*` path returns HTTP 200 serving index.html via the SPA catch-all (registerRoutes mounts before serveStatic/setupVite in server/index.ts).

**Why:** Mission Control smoke tests once reported an entire endpoint family "passing" with 200s when the routes had never been implemented at all — the 200s were the frontend HTML shell.

**How to apply:** When verifying an API contract, always assert `content-type: application/json` (or check the body isn't `<!DOCTYPE html>`), never just the status code. Integration test scripts should include an explicit SPA-fallback guard case.
