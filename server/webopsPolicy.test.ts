import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApprovedOrigins, validateCrawlTarget } from "./webops/crawlPolicy";
import { assertPublicDnsResolution, isPublicIpAddress } from "./webops/networkGuard";
import { assertPinnedHostname, selectPinnedDnsRecord } from "./webops/pinnedHttpsTransport";
import { crawlApprovedPublicPages } from "./webops/readOnlyCrawler";

const publicDnsResolver = async () => [{ address: "93.184.216.34", family: 4 }];

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

test("WebOps DNS guard accepts public addresses and rejects private/reserved resolution", async () => {
  assert.equal(isPublicIpAddress("93.184.216.34"), true);
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("10.0.0.8"), false);
  assert.equal(isPublicIpAddress("127.0.0.1"), false);
  assert.equal(isPublicIpAddress("169.254.169.254"), false);
  assert.equal(isPublicIpAddress("192.168.1.20"), false);
  assert.equal(isPublicIpAddress("198.51.100.5"), false);
  assert.equal(isPublicIpAddress("::1"), false);
  assert.equal(isPublicIpAddress("fd00::1"), false);
  assert.equal(isPublicIpAddress("2001:4860:4860::8888"), true);
  assert.equal(isPublicIpAddress("2001:db8::1"), false);

  await assertPublicDnsResolution("public.example", publicDnsResolver);
  await assert.rejects(
    () => assertPublicDnsResolution("private.example", async () => [{ address: "10.10.0.5", family: 4 }]),
    /dns_resolution_unsafe/,
  );
});

test("WebOps pinned HTTPS transport accepts only the validated public target and original hostname", () => {
  const selected = selectPinnedDnsRecord([
    { address: "2001:4860:4860::8888", family: 6 },
    { address: "93.184.216.34", family: 4 },
  ]);
  assert.deepEqual(selected, { address: "93.184.216.34", family: 4 });
  assert.deepEqual(
    assertPinnedHostname("www.elevate360official.com", "www.elevate360official.com", selected),
    selected,
  );
  assert.throws(
    () => assertPinnedHostname("attacker.example", "www.elevate360official.com", selected),
    /pinned_lookup_hostname_mismatch/,
  );
  assert.throws(
    () => selectPinnedDnsRecord([{ address: "169.254.169.254", family: 4 }]),
    /pinned_dns_record_invalid/,
  );
});

test("WebOps crawler blocks a private DNS resolution before fetch", async () => {
  let fetchCalled = false;
  const report = await crawlApprovedPublicPages({
    approvedOrigins: ["https://www.elevate360official.com"],
    seedUrls: ["https://www.elevate360official.com/"],
    fetcher: async () => {
      fetchCalled = true;
      return new Response("unexpected");
    },
    dnsResolver: async () => [{ address: "169.254.169.254", family: 4 }],
  });

  assert.equal(fetchCalled, false);
  assert.equal(report.pages.length, 1);
  assert.equal(report.pages[0].error, "dns_resolution_rejected");
  assert.equal(report.rejectedTargets[0].reason, "dns_resolution_unsafe");
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
    dnsResolver: publicDnsResolver,
  });

  assert.equal(report.readOnly, true);
  assert.equal(report.pages.length, 2);
  assert.equal(report.pages[1].error, "redirect_target_rejected");
  assert.equal(report.rejectedTargets[0].reason, "origin_not_allowlisted");
  assert.equal(requests.every((request) => request.method === "GET"), true);
  assert.equal(requests.every((request) => request.redirect === "manual"), true);
});
