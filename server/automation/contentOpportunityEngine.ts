import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";

export async function runContentOpportunityEngine() {
  const hotIntentRows = await db.execute(sql`
    select
      intent,
      count(*)::int as count,
      avg(lead_score)::int as avg_score
    from chat_conversations
    where intent is not null
      and created_at >= now() - interval '14 days'
    group by intent
    order by count(*) desc
    limit 10
  `);

  let created = 0;

  for (const row of hotIntentRows.rows as any[]) {
    if (!row.intent) continue;
    const topic = `High-intent ${row.intent} questions and objections`;
    await storage.createContentOpportunity({
      topic,
      contentType: "faq",
      sourceIntent: row.intent,
      opportunityScore: Number(row.count) * 5 + Number(row.avg_score ?? 0),
      evidenceJson: {
        frequency: row.count,
        avgScore: row.avg_score,
        window: "14d",
      } as any,
      recommendation: `Create a FAQ or landing-page support section for ${row.intent} traffic.`,
      status: "new",
    });
    created++;
  }

  return {
    summary: `created ${created} content opportunities`,
    meta: { created },
  };
}
