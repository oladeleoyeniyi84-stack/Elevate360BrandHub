import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("mobile nav measures its safe-area-inclusive height and clears anchored section headings", () => {
  const nav = readFileSync("client/src/components/MobileBottomNav.tsx", "utf8");
  const home = readFileSync("client/src/pages/Home.tsx", "utf8");
  const css = readFileSync("client/src/index.css", "utf8");

  assert.match(nav, /ResizeObserver\(syncHeight\)/);
  assert.match(nav, /nav\.getBoundingClientRect\(\)\.height/);
  assert.match(nav, /setProperty\("--bottom-nav-h"/);
  assert.match(nav, /removeProperty\("--bottom-nav-h"/);
  assert.match(nav, /\[data-testid="homepage-header"\]/);
  assert.match(nav, /header\?\.getBoundingClientRect\(\)\.height/);
  assert.match(home, /data-testid="homepage-header"/);
  assert.match(css, /padding-bottom: calc\(var\(--bottom-nav-h\) \+ 24px\)/);
  assert.match(css, /bottom: calc\(var\(--bottom-nav-h\) \+ 16px\)/);
  assert.doesNotMatch(css, /var\(--bottom-nav-h\) \+ [0-9]+px \+ var\(--safe-bottom\)/);
});

test("Innovation Vault preview cards are compact on mobile, clearly labeled and informational", () => {
  const home = readFileSync("client/src/pages/Home.tsx", "utf8");
  const start = home.indexOf("{/* Engineering Updates / Innovation Vault:");
  const end = home.indexOf("{/* Art Studio Section */}", start);
  assert.ok(start >= 0 && end > start);
  const vault = home.slice(start, end);

  assert.match(vault, /h-52 sm:h-auto sm:aspect-\[4\/3\]/);
  assert.match(vault, /Development preview/);
  assert.match(vault, /pb-28 sm:py-20/);
  assert.match(vault, /Private Development/);
  assert.match(vault, /Not available for public use/);
  assert.match(vault, /No launch date has been announced/);
  assert.doesNotMatch(vault, /Open app|Buy now|Book now|Download app|Join waitlist/);
});

test("the AI Concierge stays accessible while using a smaller launcher over the Vault", () => {
  const ai = readFileSync("client/src/components/AIConcierge.tsx", "utf8");
  assert.match(ai, /new IntersectionObserver/);
  assert.match(ai, /vaultVisibleOnMobile && !open/);
  assert.match(ai, /compactVaultLauncher \? "sm" : "lg"/);
  assert.match(ai, /data-compact=\{compactVaultLauncher/);
  assert.match(ai, /aria-label=\{open \? "Close Elevate360 AI Concierge" : "Open Elevate360 AI Concierge"\}/);
  assert.match(ai, /id="ai-concierge-dialog"/);
});
