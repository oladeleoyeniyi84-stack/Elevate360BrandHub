import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { CheckResult } from "./types";

const LEAD_STALE_THRESHOLD_DAYS = 7;
const DIGEST_STALE_THRESHOLD_DAYS = 14;

export async function runReliabilityChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Health endpoint — check DB responds
  let dbOk = false;
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  results.push({
    checkKey: "reliability_health_db_responds",
    checkGroup: "reliability",
    title: "Database health check responds correctly",
    severity: "critical",
    status: dbOk ? "pass" : "fail",
    expectedValue: "SELECT 1 responds in < 2000ms",
    actualValue: dbOk ? `${dbLatencyMs}ms` : "timeout or error",
    detailsJson: { dbOk, dbLatencyMs },
  });

  // 2. Audit log recent writes — any events in last 30 days
  const recentAuditRow = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM audit_logs
    WHERE created_at > NOW() - INTERVAL '30 days'
  `);
  const recentAuditCount = Number((recentAuditRow.rows[0] as any)?.cnt ?? 0);
  results.push({
    checkKey: "reliability_audit_log_has_recent_writes",
    checkGroup: "reliability",
    title: "Audit log has recent event entries",
    severity: "low",
    status: recentAuditCount > 0 ? "pass" : "warning",
    expectedValue: "> 0 events in last 30 days",
    actualValue: `${recentAuditCount} events`,
    detailsJson: {
      recentAuditCount,
      explanation: "If no audit events exist, the logging system may not be triggering correctly.",
    },
  });

  // 3. Days since last lead warning logic
  const lastLeadRow = await db.execute(sql`
    SELECT MAX(created_at) AS last_at FROM chat_conversations
  `);
  const lastLeadAt = (lastLeadRow.rows[0] as any)?.last_at;
  const daysSinceLead = lastLeadAt
    ? Math.floor((Date.now() - new Date(lastLeadAt).getTime()) / 86_400_000)
    : 999;

  results.push({
    checkKey: "reliability_days_since_last_lead",
    checkGroup: "reliability",
    title: `Days since last chat lead (warn if > ${LEAD_STALE_THRESHOLD_DAYS})`,
    severity: "medium",
    status: daysSinceLead <= LEAD_STALE_THRESHOLD_DAYS ? "pass" : "warning",
    expectedValue: `≤ ${LEAD_STALE_THRESHOLD_DAYS} days`,
    actualValue: lastLeadAt ? `${daysSinceLead} day(s) ago` : "No leads ever",
    detailsJson: {
      lastLeadAt: lastLeadAt ?? null,
      daysSinceLead,
      thresholdDays: LEAD_STALE_THRESHOLD_DAYS,
    },
  });

  // 4. Days since last digest warning logic
  const lastDigestRow = await db.execute(sql`
    SELECT MAX(generated_at) AS last_at FROM digest_reports
  `);
  const lastDigestAt = (lastDigestRow.rows[0] as any)?.last_at;
  const daysSinceDigest = lastDigestAt
    ? Math.floor((Date.now() - new Date(lastDigestAt).getTime()) / 86_400_000)
    : 999;

  results.push({
    checkKey: "reliability_days_since_last_digest",
    checkGroup: "reliability",
    title: `Days since last intelligence digest (warn if > ${DIGEST_STALE_THRESHOLD_DAYS})`,
    severity: "low",
    status: daysSinceDigest <= DIGEST_STALE_THRESHOLD_DAYS ? "pass" : "warning",
    expectedValue: `≤ ${DIGEST_STALE_THRESHOLD_DAYS} days`,
    actualValue: lastDigestAt ? `${daysSinceDigest} day(s) ago` : "No digest generated yet",
    detailsJson: {
      lastDigestAt: lastDigestAt ?? null,
      daysSinceDigest,
      thresholdDays: DIGEST_STALE_THRESHOLD_DAYS,
    },
  });

  // 5. Required env vars present
  const envChecks = [
    { key: "OPENAI_API_KEY", label: "OpenAI API Key" },
    { key: "RESEND_API_KEY", label: "Resend API Key" },
    { key: "DASHBOARD_PIN", label: "Dashboard PIN" },
  ];
  for (const { key, label } of envChecks) {
    const present = !!process.env[key];
    results.push({
      checkKey: `reliability_env_${key.toLowerCase()}`,
      checkGroup: "reliability",
      title: `${label} environment variable is set`,
      severity: key === "DASHBOARD_PIN" ? "critical" : "high",
      status: present ? "pass" : "fail",
      expectedValue: "present",
      actualValue: present ? "present" : "missing",
      detailsJson: { envKey: key },
    });
  }

  return results;
}
