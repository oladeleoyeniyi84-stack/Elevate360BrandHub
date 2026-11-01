import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("general API limiter ignores unverified Cloudflare identity headers", () => {
  const source = readFileSync("server/routes.ts", "utf8");
  const resolver = source.match(/function getClientIp\(req: any\): string \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(resolver);
  assert.match(resolver, /req\.ip/);
  assert.doesNotMatch(resolver, /cf-connecting-ip|req\.headers/);
});

test("recalled visitor text is not promoted to a system-role message", () => {
  const source = readFileSync("server/openai.ts", "utf8");
  const memory = source.match(/\.\.\.\(memoryContext \? \[\{([\s\S]*?)\}\] : \[\]\)/)?.[1];
  assert.ok(memory);
  assert.match(memory, /role: "user"/);
  assert.doesNotMatch(memory, /role: "system"/);
  assert.match(memory, /wrapUntrustedPromptData/);
});

test("social metadata does not attribute Elevate360 to the builder", () => {
  assert.doesNotMatch(readFileSync("client/index.html", "utf8"), /name="twitter:site" content="@replit"/);
});
