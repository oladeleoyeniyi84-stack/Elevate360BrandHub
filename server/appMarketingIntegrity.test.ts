import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages = [
  ["Bondedlove", "BondedLoveProduct.tsx", "/apps/bondedlove"],
  ["Healthwisesupport", "HealthWiseProduct.tsx", "/apps/healthwise"],
  ["Video Crafter", "VideoCrafterProduct.tsx", "/apps/video-crafter"],
] as const;

test("app homepage cards navigate to app information rather than claiming suspended apps are open", () => {
  const home = readFileSync("client/src/pages/Home.tsx","utf8");
  for(const [name,,route] of pages) {
    assert.ok(home.includes(`href="${route}"`), name+" marketing link");
    assert.ok(home.includes(`aria-label="View ${name} app details"`), name+" accessible link label");
  }
  assert.doesNotMatch(home, /Open app <ArrowRight/);
});

test("suspended app information pages acknowledge unavailability and do not sell brand plans as app access", () => {
  for(const [name,file] of pages) {
    const s = readFileSync("client/src/pages/"+file, "utf8");
    assert.match(s, /role="status"[^>]*data-testid="app-unavailable-status"/, name);
    assert.match(s, /temporarily unavailable/, name);
    assert.doesNotMatch(s, /href="\/pricing"/, name);
  }
});
