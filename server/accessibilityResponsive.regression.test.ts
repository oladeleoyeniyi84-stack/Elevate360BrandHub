import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Phase 72.8 accessibility and responsive safeguards remain present", () => {
  const app = source("client/src/App.tsx");
  const home = source("client/src/pages/Home.tsx");
  const concierge = source("client/src/components/AIConcierge.tsx");
  const mobileNav = source("client/src/components/MobileBottomNav.tsx");
  const css = source("client/src/index.css");
  const html = source("client/index.html");

  assert.match(app, /href="#main-content"/);
  assert.match(app, /<main id="main-content" tabIndex=\{-1\}>/);
  assert.match(html, /viewport-fit=cover/);
  assert.doesNotMatch(html, /maximum-scale/);

  assert.match(home, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(home, /aria-controls="mobile-navigation-drawer"/);
  assert.match(home, /role="dialog"/);
  assert.match(home, /aria-modal="true"/);
  assert.match(home, /bookingReturnFocusRef\.current\?\.focus/);
  assert.match(home, /role="alert"/);

  assert.match(concierge, /aria-controls="ai-concierge-dialog"/);
  assert.match(concierge, /aria-live="polite"/);
  assert.match(concierge, /id="concierge-message"/);
  assert.match(concierge, /event\.key === "Escape"/);
  assert.match(mobileNav, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(mobileNav, /min-h-14/);

  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.skip-link/);
  assert.match(css, /body\[data-drawer-open="true"\] \.e360-drawer-hide/);
});