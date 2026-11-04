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

test("mobile AI tab replaces floating homepage launcher without losing chat access", () => {
  const ai = readFileSync("client/src/components/AIConcierge.tsx", "utf8");
  const nav = readFileSync("client/src/components/MobileBottomNav.tsx", "utf8");
  const css = readFileSync("client/src/index.css", "utf8");

  assert.match(nav, /id: "ai".*label: "AI"/);
  assert.match(nav, /window\.dispatchEvent\(new Event\("e360:toggle-concierge"\)\)/);
  assert.match(nav, /aria-controls=\{tab\.id === "ai" \? "ai-concierge-dialog" : undefined\}/);
  assert.match(nav, /aria-expanded=\{tab\.id === "ai" \? conciergeOpen : undefined\}/);
  assert.match(nav, /setActiveId\(visible \?\? "top"\)/);
  assert.match(ai, /window\.addEventListener\("e360:toggle-concierge"/);
  assert.match(ai, /window\.dispatchEvent\(new CustomEvent\("e360:concierge-state"/);
  assert.match(ai, /id="ai-concierge-dialog"/);
  assert.match(ai, /aria-label=\{open \? "Close Elevate360 AI Concierge" : "Open Elevate360 AI Concierge"\}/);
  assert.match(css, /body\[data-bottom-nav="true"\] \[data-testid="button-ai-concierge-launcher"\] \{[\s\S]*?display: none;/);
  assert.match(css, /bottom: calc\(var\(--bottom-nav-h\) \+ 12px\)/);
});
