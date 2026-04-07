import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { CheckResult } from "./types";

export async function runFunnelChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const totalsRow = await db.execute(sql`
    SELECT
      COUNT(*) AS total_sessions,
      COUNT(CASE WHEN intent IS NOT NULL THEN 1 END) AS with_intent,
      COUNT(CASE WHEN (captured_email IS NOT NULL OR lead_email IS NOT NULL) THEN 1 END) AS email_captured,
      COUNT(CASE WHEN pipeline_stage IN ('qualified','booked','won','converted') THEN 1 END) AS qualified
    FROM chat_conversations
  `);
  const totals = totalsRow.rows[0] as any;
  const sessions = Number(totals?.total_sessions ?? 0);
  const withIntent = Number(totals?.with_intent ?? 0);
  const emailCaptured = Number(totals?.email_captured ?? 0);
  const qualified = Number(totals?.qualified ?? 0);

  // 1. Intent count must not exceed session count
  results.push({
    checkKey: "funnel_intent_lte_sessions",
    checkGroup: "funnel",
    title: "Intent count does not exceed session count",
    severity: "critical",
    status: withIntent <= sessions ? "pass" : "fail",
    expectedValue: `≤ ${sessions}`,
    actualValue: String(withIntent),
    detailsJson: { sessions, withIntent },
  });

  // 2. Email captured ≤ total sessions
  results.push({
    checkKey: "funnel_email_lte_sessions",
    checkGroup: "funnel",
    title: "Email capture count does not exceed session count",
    severity: "high",
    status: emailCaptured <= sessions ? "pass" : "fail",
    expectedValue: `≤ ${sessions}`,
    actualValue: String(emailCaptured),
    detailsJson: { sessions, emailCaptured },
  });

  // 3. Qualified count ≤ total sessions
  results.push({
    checkKey: "funnel_qualified_lte_sessions",
    checkGroup: "funnel",
    title: "Qualified count does not exceed session count",
    severity: "high",
    status: qualified <= sessions ? "pass" : "fail",
    expectedValue: `≤ ${sessions}`,
    actualValue: String(qualified),
    detailsJson: { sessions, qualified },
  });

  // 4. Booked count: check whether cancelled bookings are included (the known M03 gap)
  const bookingTotals = await db.execute(sql`
    SELECT
      COUNT(*) AS total_bookings,
      COUNT(CASE WHEN status != 'cancelled' THEN 1 END) AS active_bookings,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_bookings
    FROM bookings
  `);
  const bt = bookingTotals.rows[0] as any;
  const totalBookings = Number(bt?.total_bookings ?? 0);
  const activeBookings = Number(bt?.active_bookings ?? 0);
  const cancelledBookings = Number(bt?.cancelled_bookings ?? 0);

  results.push({
    checkKey: "funnel_booked_excludes_cancelled",
    checkGroup: "funnel",
    title: "Funnel booked count excludes cancelled bookings",
    severity: "medium",
    status: cancelledBookings === 0 ? "pass" : "warning",
    expectedValue: "0 cancelled included",
    actualValue: `${cancelledBookings} cancelled out of ${totalBookings} total`,
    detailsJson: {
      explanation: "Cancelled bookings inflate the Booked funnel count. Filter to status != 'cancelled' for accuracy.",
      totalBookings,
      activeBookings,
      cancelledBookings,
    },
  });

  // 5. Won/paid count not duplicated
  const doubleCountRows = await db.execute(sql`
    SELECT c.session_id, c.won_value, o.amount_paid
    FROM chat_conversations c
    JOIN orders o ON o.session_id = c.session_id
    WHERE c.pipeline_stage = 'won'
      AND c.won_value IS NOT NULL AND c.won_value > 0
      AND o.status = 'paid'
    LIMIT 10
  `);
  results.push({
    checkKey: "funnel_won_paid_no_double_count",
    checkGroup: "funnel",
    title: "No sessions counted in both Stripe revenue and pipeline won revenue",
    severity: "high",
    status: doubleCountRows.rows.length === 0 ? "pass" : "warning",
    expectedValue: "0 double-counted sessions",
    actualValue: `${doubleCountRows.rows.length} session(s) appear in both buckets`,
    detailsJson: {
      explanation: "If a session has both a paid Stripe order and a won_value on the pipeline, combined revenue double-counts that visitor.",
      doubleCountedSessions: doubleCountRows.rows.map((r: any) => r.session_id),
    },
  });

  return results;
}
