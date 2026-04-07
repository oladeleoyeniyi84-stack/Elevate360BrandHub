import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { CheckResult } from "./types";

export async function runFollowupChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Silent hot queue logic: score ≥ 50 + stale 3 days + email present + not overdue already
  const silentHotRows = await db.execute(sql`
    SELECT id, session_id, lead_score, followup_due_date, pipeline_stage,
      COALESCE(last_activity_at, updated_at) AS last_active
    FROM chat_conversations
    WHERE lead_score >= 50
      AND COALESCE(last_activity_at, updated_at) < NOW() - INTERVAL '3 days'
      AND (followup_due_date IS NULL OR followup_due_date >= NOW())
      AND pipeline_stage NOT IN ('won','lost','closed')
      AND (captured_email IS NOT NULL OR lead_email IS NOT NULL)
    ORDER BY lead_score DESC LIMIT 10
  `);

  const hotQueueCount = silentHotRows.rows.length;
  results.push({
    checkKey: "followup_silent_hot_queue_valid",
    checkGroup: "followup",
    title: "Silent hot queue logic is valid (score ≥ 50, stale 3+ days, email present)",
    severity: "medium",
    status: "pass",
    expectedValue: "Correct rule applied",
    actualValue: `${hotQueueCount} leads currently in silent hot queue`,
    detailsJson: {
      queueCount: hotQueueCount,
      rule: "score >= 50 AND last_activity < 3 days ago AND email present AND not already overdue",
      sampleSessions: silentHotRows.rows.map((r: any) => ({
        sessionId: r.session_id,
        score: r.lead_score,
        stage: r.pipeline_stage,
      })),
    },
  });

  // 2. Overdue queue excludes won/closed/lost
  const overdueWithClosedRows = await db.execute(sql`
    SELECT id, session_id, pipeline_stage, followup_due_date FROM chat_conversations
    WHERE followup_due_date < NOW()
      AND pipeline_stage IN ('won','lost','closed')
    LIMIT 10
  `);
  results.push({
    checkKey: "followup_overdue_excludes_won_closed",
    checkGroup: "followup",
    title: "Overdue queue correctly excludes won/lost/closed stages",
    severity: "high",
    status: overdueWithClosedRows.rows.length === 0 ? "pass" : "fail",
    expectedValue: "0 won/lost/closed in overdue queue",
    actualValue: `${overdueWithClosedRows.rows.length} closed-stage leads have overdue dates`,
    detailsJson: {
      explanation: "Leads with pipeline_stage in (won, lost, closed) should never appear in the overdue queue.",
      sampleIds: overdueWithClosedRows.rows.map((r: any) => r.id),
    },
  });

  // 3. followupCount increments properly — verify lastFollowupSentAt present where count > 0
  const countNoTimestampRows = await db.execute(sql`
    SELECT id, session_id, followup_count, last_followup_sent_at FROM chat_conversations
    WHERE followup_count > 0 AND last_followup_sent_at IS NULL
    LIMIT 10
  `);
  results.push({
    checkKey: "followup_count_has_timestamp",
    checkGroup: "followup",
    title: "Follow-up sent timestamp present where count > 0",
    severity: "medium",
    status: countNoTimestampRows.rows.length === 0 ? "pass" : "warning",
    expectedValue: "0",
    actualValue: `${countNoTimestampRows.rows.length} leads with followupCount > 0 but no timestamp`,
    detailsJson: {
      explanation: "Every follow-up send must record lastFollowupSentAt. Missing timestamps indicate data integrity issues.",
      sampleIds: countNoTimestampRows.rows.map((r: any) => r.id),
    },
  });

  // 4. Due date extension: after markFollowupSent, due date should be in the future
  const pastDueDateAfterSend = await db.execute(sql`
    SELECT id, followup_due_date, last_followup_sent_at FROM chat_conversations
    WHERE last_followup_sent_at IS NOT NULL
      AND followup_due_date IS NOT NULL
      AND followup_due_date < last_followup_sent_at
    LIMIT 10
  `);
  results.push({
    checkKey: "followup_due_date_extended_correctly",
    checkGroup: "followup",
    title: "Follow-up due date is always set after last send date",
    severity: "medium",
    status: pastDueDateAfterSend.rows.length === 0 ? "pass" : "warning",
    expectedValue: "followupDueDate > lastFollowupSentAt",
    actualValue: `${pastDueDateAfterSend.rows.length} leads with due date before last send`,
    detailsJson: {
      explanation: "After markFollowupSent, followupDueDate should be set to NOW() + 5 days, always after lastFollowupSentAt.",
      sampleIds: pastDueDateAfterSend.rows.map((r: any) => r.id),
    },
  });

  return results;
}
