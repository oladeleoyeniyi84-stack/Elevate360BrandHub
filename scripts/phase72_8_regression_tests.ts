// Phase 72.8 — hermetic regression guards. No server, database, or Google call.
import fs from "node:fs";
import {
  funnelAnalyticsRequestSchema,
  homepageAnalyticsRequestSchema,
  revenueAnalyticsRequestSchema,
  searchIntelRequestSchema,
} from "../shared/schema";

let failed = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
}

const funnelEmpty = funnelAnalyticsRequestSchema.safeParse({
  event: "strategy_page_view", sessionId: "", visitorId: "", metadata: { plan: "starter" },
});
check("empty anonymous funnel IDs remain valid and can normalize to NULL", funnelEmpty.success);
check("homepage rejects PII metadata", !homepageAnalyticsRequestSchema.safeParse({
  event: "hero_view", metadata: { email: "person@example.test" },
}).success);
check("revenue rejects email-shaped anonymous IDs", !revenueAnalyticsRequestSchema.safeParse({
  event: "affiliate_click", revenueSource: "affiliate", sessionId: "person@example.test",
}).success);
check("search rejects PII metadata", !searchIntelRequestSchema.safeParse({
  event: "content_view", contentSlug: "blog/example", metadata: { contact_email: "person@example.test" },
}).success);

const storage = fs.readFileSync("server/storage.ts", "utf8");
const gsc = fs.readFileSync("server/services/googleSearchConsole.ts", "utf8");
const growth = fs.readFileSync("server/services/searchGrowthActions.ts", "utf8");
check("GSC completion uses a running-state CAS", /eq\(gscSyncRuns\.status, "running"\)/.test(storage));
check("dashboard anchors only successful GSC runs", /getSuccessfulGscEndDate/.test(storage) && /eq\(gscSyncRuns\.status, "success"\)/.test(storage));
check("partial GSC pulls are staged and not published", /if \(status === "success"\) \{[\s\S]*upsertGscQueryRows/.test(gsc));
check("zero-candidate generations are logged", /0 candidates — no successful GSC sync run/.test(growth) && /candidates, \$\{generated\} new/.test(growth));

if (failed) process.exit(1);