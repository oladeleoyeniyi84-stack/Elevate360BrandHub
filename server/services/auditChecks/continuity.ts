import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { CheckResult } from "./types";

export async function runContinuityChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Paid orders missing session linkage
  const missingSessionRows = await db.execute(sql`
    SELECT id FROM orders
    WHERE status = 'paid'
      AND (session_id IS NULL OR session_id = '')
    ORDER BY id DESC LIMIT 10
  `);
  const missingCount = missingSessionRows.rows.length;
  const totalPaidRows = await db.execute(sql`SELECT COUNT(*) AS cnt FROM orders WHERE status = 'paid'`);
  const totalPaid = Number((totalPaidRows.rows[0] as any)?.cnt ?? 0);
  results.push({
    checkKey: "continuity_paid_orders_missing_session",
    checkGroup: "continuity",
    title: "Paid orders missing session linkage",
    severity: "critical",
    status: missingCount === 0 ? "pass" : "fail",
    expectedValue: "0",
    actualValue: String(missingCount),
    detailsJson: {
      explanation: "Paid orders without a session ID cannot be attributed to a chat conversation.",
      totalPaidOrders: totalPaid,
      missingSessions: missingCount,
      sampleIds: missingSessionRows.rows.map((r: any) => r.id),
    },
  });

  // 2. Won deals with no source session
  const wonNoSessionRows = await db.execute(sql`
    SELECT id, session_id FROM chat_conversations
    WHERE pipeline_stage = 'won'
      AND (session_id IS NULL OR session_id = '')
    ORDER BY id DESC LIMIT 10
  `);
  results.push({
    checkKey: "continuity_won_deals_no_session",
    checkGroup: "continuity",
    title: "Won deals with missing session ID",
    severity: "high",
    status: wonNoSessionRows.rows.length === 0 ? "pass" : "fail",
    expectedValue: "0",
    actualValue: String(wonNoSessionRows.rows.length),
    detailsJson: {
      explanation: "Won pipeline deals should always have a session ID linking to the conversation.",
      sampleIds: wonNoSessionRows.rows.map((r: any) => r.id),
    },
  });

  // 3. recommendedOfferAccepted=true but no acceptedOfferSlug
  const acceptedNoSlugRows = await db.execute(sql`
    SELECT id, session_id FROM chat_conversations
    WHERE recommended_offer_accepted = true
      AND (accepted_offer_slug IS NULL OR accepted_offer_slug = '')
    ORDER BY id DESC LIMIT 10
  `);
  results.push({
    checkKey: "continuity_accepted_offer_missing_slug",
    checkGroup: "continuity",
    title: "Offer accepted flag set but no offer slug recorded",
    severity: "high",
    status: acceptedNoSlugRows.rows.length === 0 ? "pass" : "fail",
    expectedValue: "0",
    actualValue: String(acceptedNoSlugRows.rows.length),
    detailsJson: {
      explanation: "If recommendedOfferAccepted is true, acceptedOfferSlug must also be set.",
      sampleIds: acceptedNoSlugRows.rows.map((r: any) => r.id),
    },
  });

  // 4. Orders attributed AI-assisted but no session exists in chat_conversations
  const aiOrphanRows = await db.execute(sql`
    SELECT o.id, o.session_id FROM orders o
    WHERE o.session_id IS NOT NULL AND o.session_id != ''
      AND NOT EXISTS (
        SELECT 1 FROM chat_conversations c WHERE c.session_id = o.session_id
      )
    ORDER BY o.id DESC LIMIT 10
  `);
  results.push({
    checkKey: "continuity_ai_attributed_no_chat_session",
    checkGroup: "continuity",
    title: "Orders with session ID but no matching chat conversation",
    severity: "high",
    status: aiOrphanRows.rows.length === 0 ? "pass" : "fail",
    expectedValue: "0",
    actualValue: String(aiOrphanRows.rows.length),
    detailsJson: {
      explanation: "Orders linking to a session ID that has no chat record cannot be verified as AI-influenced.",
      sampleIds: aiOrphanRows.rows.map((r: any) => r.id),
    },
  });

  return results;
}
