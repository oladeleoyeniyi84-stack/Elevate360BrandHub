import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { CheckResult } from "./types";

export async function runSecurityChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. SESSION_SECRET is explicitly set (not the hardcoded fallback)
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  const sessionSecretIsDefault =
    !sessionSecret ||
    sessionSecret === "e360-secret-fallback" ||
    sessionSecret === (process.env.DASHBOARD_PIN ?? "");
  results.push({
    checkKey: "security_session_secret_hardened",
    checkGroup: "security",
    title: "SESSION_SECRET is explicitly set (not the default fallback)",
    severity: "high",
    status: sessionSecretIsDefault ? "fail" : "pass",
    expectedValue: "Unique, non-default SESSION_SECRET env var",
    actualValue: sessionSecretIsDefault ? "Using fallback or DASHBOARD_PIN value" : "Custom secret is set",
    detailsJson: {
      explanation: "A guessable or default session secret allows session cookie forgery.",
      isDefault: sessionSecretIsDefault,
    },
  });

  // 2. DASHBOARD_PIN is set — cross-check from security perspective
  const pinSet = !!process.env.DASHBOARD_PIN && (process.env.DASHBOARD_PIN ?? "").length >= 6;
  results.push({
    checkKey: "security_dashboard_pin_adequate",
    checkGroup: "security",
    title: "DASHBOARD_PIN is set and at least 6 characters",
    severity: "critical",
    status: pinSet ? "pass" : "fail",
    expectedValue: "Present and ≥ 6 characters",
    actualValue: !process.env.DASHBOARD_PIN
      ? "Missing"
      : `${(process.env.DASHBOARD_PIN ?? "").length} characters`,
    detailsJson: {
      explanation: "A short or missing PIN exposes the dashboard to brute-force access.",
    },
  });

  // 3. Failed dashboard login attempts in the last 24 hours
  const failedLoginRow = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM audit_logs
    WHERE action = 'dashboard_login_failed'
      AND created_at > NOW() - INTERVAL '24 hours'
  `);
  const failedLogins24h = Number((failedLoginRow.rows[0] as any)?.cnt ?? 0);
  results.push({
    checkKey: "security_failed_logins_24h",
    checkGroup: "security",
    title: "Failed dashboard login attempts in last 24h",
    severity: "high",
    status: failedLogins24h === 0 ? "pass" : failedLogins24h <= 5 ? "warning" : "fail",
    expectedValue: "0 (warn if > 0, fail if > 5)",
    actualValue: `${failedLogins24h} failed attempt(s)`,
    detailsJson: {
      explanation: "Multiple failed logins may indicate a brute-force attack on the dashboard.",
      failedLogins24h,
    },
  });

  // 4. Newsletter signup burst — any 1-hour window with > 5 signups (possible bot attack)
  const newsletterBurstRow = await db.execute(sql`
    SELECT
      date_trunc('hour', subscribed_at) AS hour_bucket,
      COUNT(*) AS cnt
    FROM newsletter_subscribers
    WHERE subscribed_at > NOW() - INTERVAL '24 hours'
    GROUP BY hour_bucket
    HAVING COUNT(*) > 5
    ORDER BY cnt DESC
    LIMIT 1
  `);
  const hasBurst = newsletterBurstRow.rows.length > 0;
  const burstCount = hasBurst ? Number((newsletterBurstRow.rows[0] as any)?.cnt ?? 0) : 0;
  const burstHour = hasBurst ? (newsletterBurstRow.rows[0] as any)?.hour_bucket ?? null : null;
  results.push({
    checkKey: "security_newsletter_signup_burst",
    checkGroup: "security",
    title: "No newsletter signup burst detected in last 24h (> 5 in 1 hour)",
    severity: "medium",
    status: hasBurst ? "warning" : "pass",
    expectedValue: "≤ 5 signups per hour",
    actualValue: hasBurst ? `${burstCount} signups in 1 hour at ${burstHour}` : "No burst detected",
    detailsJson: {
      explanation: "A high volume of signups in a short window may indicate bot activity that bypassed protection.",
      hasBurst,
      burstCount,
      burstHour,
    },
  });

  // 5. Contact form burst — any 1-hour window with > 3 contacts in last 24h
  const contactBurstRow = await db.execute(sql`
    SELECT
      date_trunc('hour', created_at) AS hour_bucket,
      COUNT(*) AS cnt
    FROM contact_messages
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY hour_bucket
    HAVING COUNT(*) > 3
    ORDER BY cnt DESC
    LIMIT 1
  `);
  const hasContactBurst = contactBurstRow.rows.length > 0;
  const contactBurstCount = hasContactBurst ? Number((contactBurstRow.rows[0] as any)?.cnt ?? 0) : 0;
  results.push({
    checkKey: "security_contact_form_burst",
    checkGroup: "security",
    title: "No contact form burst detected in last 24h (> 3 in 1 hour)",
    severity: "medium",
    status: hasContactBurst ? "warning" : "pass",
    expectedValue: "≤ 3 contact submissions per hour",
    actualValue: hasContactBurst ? `${contactBurstCount} submissions in 1 hour` : "No burst detected",
    detailsJson: {
      explanation: "A burst of contact form submissions may indicate a spam campaign that bypassed rate limiting.",
      hasContactBurst,
      contactBurstCount,
    },
  });

  // 6. Duplicate newsletter domains — > 3 unique emails from same domain in last 7 days
  const domainBurstRow = await db.execute(sql`
    SELECT
      split_part(email, '@', 2) AS domain,
      COUNT(*) AS cnt
    FROM newsletter_subscribers
    WHERE subscribed_at > NOW() - INTERVAL '7 days'
    GROUP BY domain
    HAVING COUNT(*) > 3
    ORDER BY cnt DESC
    LIMIT 1
  `);
  const hasDomainBurst = domainBurstRow.rows.length > 0;
  const domainBurstDomain = hasDomainBurst ? (domainBurstRow.rows[0] as any)?.domain : null;
  const domainBurstCnt = hasDomainBurst ? Number((domainBurstRow.rows[0] as any)?.cnt ?? 0) : 0;
  results.push({
    checkKey: "security_newsletter_domain_concentration",
    checkGroup: "security",
    title: "No suspicious email domain concentration in newsletter list (last 7 days)",
    severity: "low",
    status: hasDomainBurst ? "warning" : "pass",
    expectedValue: "≤ 3 signups from the same domain in 7 days",
    actualValue: hasDomainBurst
      ? `${domainBurstCnt} signups from @${domainBurstDomain}`
      : "No domain concentration detected",
    detailsJson: {
      explanation: "Many emails from the same domain may indicate fake/bulk-generated addresses.",
      hasDomainBurst,
      domainBurstDomain,
      domainBurstCnt,
    },
  });

  return results;
}
