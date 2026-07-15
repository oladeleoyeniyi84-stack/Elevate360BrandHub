---
name: Headless screenshot workflow
description: How to capture homepage screenshots for Mission Control sprints without polluting the final diff
---

Mission Control sprints repeatedly require desktop+mobile screenshots with a clean final git diff (no tooling committed).

**Working recipe:**
- Install `chromium` via system deps + `puppeteer-core` via the language package tool (bash `npm install` is blocked). Launch with `executablePath: which chromium` and `--no-sandbox --disable-dev-shm-usage`.
- Suppress overlays before `page.goto` via `evaluateOnNewDocument`: `localStorage.setItem('elevate360_cookie_consent','accepted')` and `sessionStorage.setItem('e360_popup_dismissed','1')`.
- Sections use IntersectionObserver reveal animations: scroll through the section in ~300px steps with 200ms pauses before the element screenshot, or lower cards render dark/empty.
- Viewports: 1440x900 desktop, 390x844 deviceScaleFactor 2 mobile.

**Cleanup rules (Why: directive is "do not commit screenshots/ or tooling"):**
- Uninstall puppeteer-core + chromium at the end; restore `package-lock.json` via `git show HEAD:package-lock.json > package-lock.json` (install/uninstall leaves ws-package mirror-URL drift).
- `replit.nix` CANNOT be deleted or edited directly (platform blocks it). `uninstallSystemDependencies` leaves an empty `deps = []` stub — that stub is the canonical revert; disclose it in the final diff.
- `present_asset` the screenshots first, then `rm -rf screenshots/` so the final diff shows only deletions.
- `uninstallSystemDependencies` takes `packages: [...]`, not `dependency_list`.
