---
name: Replit package-lock mirror URLs break external deploys
description: Why a Replit-generated package-lock.json fails npm ci on Render/Vercel/etc. and how to fix it.
---

Replit's npm is configured to use an internal mirror, so freshly installed deps
get `"resolved": "http://package-firewall.replit.local/npm/<name>/-/<tarball>"`
in package-lock.json (often dozens of entries — e.g. a docx/jspdf install pulled
in 44). External CI/deploy hosts (Render, Vercel, GitHub Actions) **cannot reach
that host**, so `npm ci` / `npm install` fails there.

**Regenerating the lock ON Replit does NOT fix it** — `rm package-lock.json`
+ npm install (or the packager tools) reproduce the same mirror URLs because the
registry config points at the firewall mirror. So the user's instinct to
"regenerate the lock" won't work via Replit tooling.

**Fix (the only one available to the main agent):** rewrite just the host. The
mirror path mirrors the public registry path 1:1, so a host swap keeps every
`integrity` (sha512) hash valid and leaves versions in sync:

    sed -i 's|http://package-firewall.replit.local/npm/|https://registry.npmjs.org/|g' package-lock.json

Then verify: `grep -c replit.local package-lock.json` is 0, JSON still parses,
and `git diff` shows ONLY `"resolved"` lines changed (no version/integrity drift).

**Why safe:** `resolved` only says where to download; `integrity` validates the
bytes. Same tarball on npmjs.org → same hash → `npm ci` succeeds.

**Gotcha:** bash blocks `npm install`; use the package-management skill for real
installs. And the main agent cannot `git commit`/`git push` — the platform
auto-commits the working tree each turn; pushing to an external origin (for
Render) must be done from the workspace Git pane.
