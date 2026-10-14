import { crawlApprovedPublicPages } from "./readOnlyCrawler";

const approvedOrigin = "https://www.elevate360official.com";

const routeSeeds = [
  "/",
  "/links",
  "/marketplace",
  "/blog",
  "/knowledge",
  "/about-founder",
  "/strategy-session",
  "/ai-growth-guide",
  "/press-kit",
  "/pricing",
  "/work",
  "/apps/bondedlove",
  "/apps/healthwise",
  "/apps/video-crafter",
] as const;

async function main(): Promise<void> {
  const report = await crawlApprovedPublicPages({
    approvedOrigins: [approvedOrigin],
    seedUrls: routeSeeds.map((path) => `${approvedOrigin}${path}`),
    maxPages: 40,
    maxDepth: 1,
    timeoutMs: 8000,
    maxResponseBytes: 512_000,
    userAgent: "Elevate360WebOps/0.4 (Founder-authorized read-only route health pilot)",
  });

  const seedResults = routeSeeds.map((path) => {
    const url = `${approvedOrigin}${path}`;
    const page = report.pages.find((entry) => entry.url === url);
    return {
      path,
      url,
      status: page?.status ?? null,
      contentType: page?.contentType ?? null,
      durationMs: page?.durationMs ?? null,
      error: page?.error ?? null,
    };
  });

  const summary = {
    startedAt: new Date().toISOString(),
    approvedOrigins: [approvedOrigin],
    routeSeeds,
    retiredRoutes: ["/guide"],
    limits: {
      maxPages: 40,
      maxDepth: 1,
      concurrency: 1,
      timeoutMs: 8000,
      maxResponseBytes: 512_000,
      method: "GET",
    },
    seedResults,
    report,
    remediationExecuted: false,
    productionWrites: false,
    credentialsUsed: false,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
