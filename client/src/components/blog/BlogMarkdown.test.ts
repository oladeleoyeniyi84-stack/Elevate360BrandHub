import assert from "node:assert/strict";
import test from "node:test";
import { insertAfterHeading, mediaMarkdown } from "./BlogMarkdown";

const article = [
  "# Git Blob Explained",
  "",
  "## 3. Object Types",
  "A blob stores file content.",
  "",
  "## 4. Core Git Internals — Conceptual Model",
  "The diagram follows.",
  "",
  "```text",
  "## Not a real section",
  "HEAD -> main -> commit",
  "```",
  "",
  "### References",
  "HEAD is symbolic.",
  "",
  "## 5. Staging",
  "git add updates the index.",
].join("\n");

test("inserts image only after complete Section 4, before Section 5", () => {
  const img = mediaMarkdown("/api/blog-media/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", "Git object model", "Architecture");
  const out = insertAfterHeading(article, "Core Git Internals", img);
  assert.ok(out.indexOf("HEAD is symbolic.") < out.indexOf("![Git object model]"));
  assert.ok(out.indexOf("![Git object model]") < out.indexOf("## 5. Staging"));
  assert.ok(out.includes("## Not a real section"));
});

test("rejects an absent Section 4 to prevent incorrect placement", () => {
  assert.throws(() => insertAfterHeading("# Article", "Core Git Internals", "![x](url)"), /not found/);
});

test("rejects non-local image URLs and requires alt text", () => {
  assert.throws(() => mediaMarkdown("javascript:alert(1)", "x", ""), /Invalid image/);
  assert.throws(() => mediaMarkdown("https://example.com/tracker.png", "x", ""), /Invalid image/);
  assert.throws(() => mediaMarkdown("/api/blog-media/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", "", ""), /alt text/);
});
