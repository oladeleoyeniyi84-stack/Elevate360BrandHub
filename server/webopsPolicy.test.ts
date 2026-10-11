import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApprovedOrigins, validateCrawlTarget } from "./webops/crawlPolicy";
import { crawlApprovedPublicPages } from "./webops/readOnlyCrawler";

test("WebOps accepts exact public HTTPS origins only", () => {
  const origins = normalizeApprovedOrigins([
    "https://www.elevate360official.com",
    "https://bondedlove.elevate360official.com",
  ]);

  assert.equal(origins.has("https://www.elevate360official.com"), true);
  assert.equal(origins.has("https://bondedlove.elevate360official.com"), true);
  assert.throws(() => normalizeApprovedOrigins(["http://example.com"]));
  assert.throws(() => normalizeApprovedOrigins(["https://localhost"]));
  assert.throws(() => normalizeApprovedOrigins(["https://127.0.0.1"]));
  assert.throws(() => normalizeApprovedOrigins(["https://[::1]"]));
  assert.throws(() => normalizeApprovedOrigins(["https://example.com/admin"]));
});

test("WebOps rejects non-HTTPS, credentials, private hosts and unapproved origins", () => {
  const origins = normalizeApprovedOrigins(["https://www.elevate360official.com"]);

  assert.deepEqual(
    validateCrawlTarget("http://www.elevate360official.com", origins),
    { allowed: false, reason: "https_required" },
  );
  assert.deepEqual(
    validateCrawlTarget("https://user:pass@www.elevate360official.com", origins),
    { allowed: false, reason: "credentials_forbidden" },
  );
  assert.deepEqual(
    validateCrawlTarget("https://localhost", origins),
    { allowed: false, reason: "unsafe_hostname" },
  );
  assert.deepEqual(
    validateCrawlTarget("https://unapproved.example", origins),
    { allowed: false, reason: "origin_not_allowlisted" },
  );
});

test("WebOps resolves relative links, strips fragments and enforces redirect origin", () => {
  const origins = normalizeApprovedOrigins(["https://www.elevate360official.com"]);
  assert.deepEqual(
    validateCrawlTarget("/work#portfolio", origins, "https://www.elevate360official.com/"),
    { allowed: true, url: "https://www.elevate360official.com/work", origin: "https://www.elevate360official.com" },
  );
  assert.deepEqual(
    validateCrawlTarget("https://unapproved.example/login", origins, "https://www.elevate360official.com/"),
    { allowed: false, reason: "origin_not_allowlisted" },
  );
});

test("WebOps crawler stays read-only, bounded and rejects off-allowlist redirects", async () => {
  const requests: Array<{ url: string; method?: string; redirect?: RequestRedirect }> = [];
  const fakeFetcher = async (url: string, init: RequestInit): Promise<Response> => {
    requests.push({ url, method: init.method, redirect: init.redirect });
    if (url.endsWith("/")) {
      return new Response('<a href="/work#top">Work</a><a href="https://outside.example/">External</a>', {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    return new Response("", {
      status: 302,
      headers: { location: "https://outside.example/redirect" },
    });
  };

  const report = await crawlApprovedPublicPages({
    approvedOrigins: ["https://www.elevate360official.com"],
    seedUrls: ["https://www.elevate360official.com/"],
    maxPages: 5,
    maxDepth: 2,
    fetcher: fakeFetcher,
  });

  assert.equal(report.readOnly, true);
  assert.equal(report.pages.length, 2);
  assert.equal(report.pages[1].error, "redirect_target_rejected");
  assert.equal(report.rejectedTargets[0].reason, "origin_not_allowlisted");
  assert.equal(requests.every((request) => request.method === "GET"), true);
  assert.equal(requests.every((request) => request.redirect === "manual"), true);
});
