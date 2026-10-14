import { crawlApprovedPublicPages } from "./readOnlyCrawler";

const approvedOrigin = "https://www.elevate360official.com";

async function main(): Promise<void> {
  const report = await crawlApprovedPublicPages({
    approvedOrigins: [approvedOrigin],
    seedUrls: [`${approvedOrigin}/`],
    maxPages: 25,
    maxDepth: 2,
    timeoutMs: 8000,
    maxResponseBytes: 512_000,
    userAgent: "Elevate360WebOps/0.3 (Founder-authorized read-only live pilot)",
  });

  const summary = {
    startedAt: new Date().toISOString(),
    approvedOrigins: [approvedOrigin],
    limits: {
      maxPages: 25,
      maxDepth: 2,
      concurrency: 1,
      timeoutMs: 8000,
      maxResponseBytes: 512_000,
      method: "GET",
    },
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
