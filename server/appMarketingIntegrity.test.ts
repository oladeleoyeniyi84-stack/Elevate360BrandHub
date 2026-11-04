import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages = [
  ["Bonded Love", "BondedLoveProduct.tsx", "/apps/bondedlove"],
  ["Healthwise Support", "HealthWiseProduct.tsx", "/apps/healthwise"],
  ["Video Crafter", "VideoCrafterProduct.tsx", "/apps/video-crafter"],
] as const;

test("Engineering Updates keeps all three suspended apps in an informational Innovation Vault", () => {
  const home = readFileSync("client/src/pages/Home.tsx", "utf8");
  const start = home.indexOf('{/* Engineering Updates / Innovation Vault: information only while apps are suspended */}');
  const end = home.indexOf('{/* Art Studio Section */}', start);
  assert.ok(start >= 0 && end > start, "Innovation Vault section exists ahead of Art Studio");
  const apps = home.slice(start, end);

  assert.match(apps, /data-testid="engineering-updates"/);
  assert.match(apps, /Elevate360 Innovation Vault/);
  assert.match(apps, /In the Vault · Private Development/);
  assert.match(apps, /Not available for public use/);
  assert.match(apps, /No launch date has been announced/);
  assert.match(apps, /href="\/work"/);
  assert.match(apps, /href=\{app\.route\}/);
  assert.match(apps, /aria-label=\{`View \$\{app\.name\} project details`\}/);

  for (const [name,,route] of pages) {
    assert.ok(apps.includes(`name: "${name}"`), `${name} appears in Vault`);
    assert.ok(apps.includes(`route: "${route}"`), `${name} informational route exists`);
  }
  assert.doesNotMatch(apps, /Open app|Book now|Buy now|Download app|Join waitlist/i);
  assert.doesNotMatch(apps, /href="\/pricing"|href="https:\/\/(?:crafter|healthwisesupport|bondedlove)/);
});

test("suspended app information pages acknowledge unavailability without selling brand plans as app access", () => {
  for (const [name, file] of pages) {
    const s = readFileSync("client/src/pages/" + file, "utf8");
    assert.match(s, /role="status"[^>]*data-testid="app-unavailable-status"/, name);
    assert.match(s, /temporarily unavailable/, name);
    assert.doesNotMatch(s, /href="\/pricing"/, name);
  }
});
