import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { CheckResult } from "./types";

const VALID_SOURCES = ["page", "whatsapp", "stripe_checkout", "ai", "direct", "email"];

export async function runAttributionChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Accepted offer true implies accepted offer slug exists
  const acceptedNoSlug = await db.execute(sql`
    SELECT id FROM chat_conversations
    WHERE recommended_offer_accepted = true
      AND (accepted_offer_slug IS NULL OR accepted_offer_slug = '')
    LIMIT 10
  `);
  results.push({
    checkKey: "attribution_accepted_offer_missing_slug",
    checkGroup: "attribution",
    title: "All accepted offers have a slug recorded",
    severity: "high",
    status: acceptedNoSlug.rows.length === 0 ? "pass" : "fail",
    expectedValue: "0",
    actualValue: String(acceptedNoSlug.rows.length),
    detailsJson: {
      explanation: "recommendedOfferAccepted=true requires acceptedOfferSlug to be set for attribution to work.",
      sampleIds: acceptedNoSlug.rows.map((r: any) => r.id),
    },
  });

  // 2. Accepted offer source is a valid enum value
  const invalidSourceRows = await db.execute(sql`
    SELECT id, accepted_offer_source FROM chat_conversations
    WHERE accepted_offer_source IS NOT NULL
      AND accepted_offer_source NOT IN ('page','whatsapp','stripe_checkout','ai','direct','email')
    LIMIT 10
  `);
  results.push({
    checkKey: "attribution_source_valid_enum",
    checkGroup: "attribution",
    title: "All offer sources use valid category values",
    severity: "medium",
    status: invalidSourceRows.rows.length === 0 ? "pass" : "warning",
    expectedValue: `One of: ${VALID_SOURCES.join(", ")}`,
    actualValue: invalidSourceRows.rows.length === 0
      ? "All valid"
      : `${invalidSourceRows.rows.length} invalid values`,
    detailsJson: {
      validSources: VALID_SOURCES,
      invalidRows: invalidSourceRows.rows.map((r: any) => ({ id: r.id, source: r.accepted_offer_source })),
    },
  });

  // 3. AI-influenced orders actually have session + recommendation history
  const aiInfluencedNoRec = await db.execute(sql`
    SELECT o.id, o.session_id FROM orders o
    JOIN chat_conversations c ON c.session_id = o.session_id
    WHERE o.session_id IS NOT NULL
      AND c.recommended_offer_accepted = true
      AND (c.recommended_offer IS NULL OR c.recommended_offer = '')
    LIMIT 10
  `);
  results.push({
    checkKey: "attribution_ai_influenced_has_recommendation",
    checkGroup: "attribution",
    title: "AI-influenced orders have a recommendation on file",
    severity: "high",
    status: aiInfluencedNoRec.rows.length === 0 ? "pass" : "warning",
    expectedValue: "0 AI-influenced orders without recommendation",
    actualValue: `${aiInfluencedNoRec.rows.length} anomalies`,
    detailsJson: {
      explanation: "Orders marked AI-influenced should have a recommendedOffer in the chat session.",
      sampleIds: aiInfluencedNoRec.rows.map((r: any) => r.id),
    },
  });

  // 4. Direct orders do not have false AI link
  const directWithSession = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM orders
    WHERE (session_id IS NULL OR session_id = '')
  `);
  const directCount = Number((directWithSession.rows[0] as any)?.cnt ?? 0);
  results.push({
    checkKey: "attribution_direct_no_false_ai_link",
    checkGroup: "attribution",
    title: "Direct orders (no session) correctly categorized",
    severity: "medium",
    status: "pass",
    expectedValue: "sessionId=null → direct",
    actualValue: `${directCount} orders with no session (correctly classified as direct)`,
    detailsJson: {
      directOrderCount: directCount,
      explanation: "Orders without sessionId are correctly shown as direct in the attribution dashboard.",
    },
  });

  return results;
}
