import { db } from "../db";
import { auditRuns, auditChecks, auditIssues } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { CheckResult, CheckSeverity } from "./auditChecks/types";
import { runContinuityChecks } from "./auditChecks/continuity";
import { runFunnelChecks } from "./auditChecks/funnel";
import { runRevenueChecks } from "./auditChecks/revenue";
import { runAttributionChecks } from "./auditChecks/attribution";
import { runFollowupChecks } from "./auditChecks/followup";
import { runReliabilityChecks } from "./auditChecks/reliability";
import { runSecurityChecks } from "./auditChecks/security";

type AuditType = "full" | "revenue" | "attribution" | "funnel" | "followup" | "reliability" | "continuity" | "security";

function computeVerdict(criticalCount: number, highCount: number, checksFailed: number, checksPassed: number): string {
  if (criticalCount > 0) return "not_yet_trusted";
  if (highCount > 2 || checksFailed > (checksPassed + checksFailed) * 0.25) return "trusted_with_exceptions";
  return "trusted";
}

async function getChecksForType(auditType: AuditType): Promise<CheckResult[]> {
  const allChecks: CheckResult[] = [];
  if (auditType === "full" || auditType === "continuity") {
    allChecks.push(...await runContinuityChecks());
  }
  if (auditType === "full" || auditType === "funnel") {
    allChecks.push(...await runFunnelChecks());
  }
  if (auditType === "full" || auditType === "revenue") {
    allChecks.push(...await runRevenueChecks());
  }
  if (auditType === "full" || auditType === "attribution") {
    allChecks.push(...await runAttributionChecks());
  }
  if (auditType === "full" || auditType === "followup") {
    allChecks.push(...await runFollowupChecks());
  }
  if (auditType === "full" || auditType === "reliability") {
    allChecks.push(...await runReliabilityChecks());
  }
  if (auditType === "full" || auditType === "security") {
    allChecks.push(...await runSecurityChecks());
  }
  return allChecks;
}

export async function runAudit(auditType: AuditType, createdBy = "admin") {
  // 1. Create audit run row (status = running)
  const [run] = await db.insert(auditRuns).values({
    auditType,
    status: "running",
    createdBy,
  }).returning();

  try {
    // 2. Execute checks
    const checks = await getChecksForType(auditType);

    // 3. Compute counts
    let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;
    let checksPassed = 0, checksFailed = 0;

    for (const c of checks) {
      if (c.status === "pass") checksPassed++;
      else checksFailed++;

      if (c.status === "fail") {
        if (c.severity === "critical") criticalCount++;
        else if (c.severity === "high") highCount++;
        else if (c.severity === "medium") mediumCount++;
        else lowCount++;
      }
    }

    // 4. Insert check rows
    if (checks.length > 0) {
      await db.insert(auditChecks).values(
        checks.map((c) => ({
          auditRunId: run.id,
          checkKey: c.checkKey,
          checkGroup: c.checkGroup,
          title: c.title,
          severity: c.severity,
          status: c.status,
          expectedValue: c.expectedValue,
          actualValue: c.actualValue,
          detailsJson: c.detailsJson ?? null,
        }))
      );
    }

    // 5. Auto-create audit issues for failures and warnings above medium
    const issueChecks = checks.filter(
      (c) => c.status === "fail" && (c.severity === "critical" || c.severity === "high")
    );
    for (const c of issueChecks) {
      // Check if an open issue with this checkKey already exists
      const existing = await db
        .select({ id: auditIssues.id })
        .from(auditIssues)
        .where(eq(auditIssues.issueCode, c.checkKey))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(auditIssues).values({
          auditRunId: run.id,
          issueCode: c.checkKey,
          area: c.checkGroup,
          severity: c.severity,
          expected: c.expectedValue,
          actual: c.actualValue,
          suspectedCause: (c.detailsJson as any)?.explanation ?? null,
          status: "open",
        });
      }
    }

    // 6. Compute verdict and update run
    const overallVerdict = computeVerdict(criticalCount, highCount, checksFailed, checksPassed);
    const summary = `${checks.length} checks run. ${checksPassed} passed, ${checksFailed} failed/warning. Verdict: ${overallVerdict}.`;

    const [updatedRun] = await db
      .update(auditRuns)
      .set({ status: "completed", overallVerdict, criticalCount, highCount, mediumCount, lowCount, checksPassed, checksFailed, summary })
      .where(eq(auditRuns.id, run.id))
      .returning();

    return { run: updatedRun, checks, issuesCreated: issueChecks.length };
  } catch (err: any) {
    await db.update(auditRuns).set({ status: "failed", summary: err.message ?? "Unknown error" }).where(eq(auditRuns.id, run.id));
    throw err;
  }
}
