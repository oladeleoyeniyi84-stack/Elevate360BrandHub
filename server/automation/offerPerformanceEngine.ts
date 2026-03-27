import { storage } from "../storage";
import { computeOfferPerformanceScore } from "../services/growthScoring";

export async function runOfferPerformanceEngine() {
  const result: any = await storage.getOfferPerformanceCandidates(30);
  const rows = result.rows ?? result;

  let created = 0;

  for (const row of rows) {
    const recommendedCount = Number(row.recommended_count ?? 0);
    const acceptedCount = Number(row.accepted_count ?? 0);
    const paidCount = Number(row.paid_count ?? 0);
    const avgOrderValue = Number(row.avg_order_value ?? 0);

    const acceptanceRate = recommendedCount > 0 ? Math.round((acceptedCount / recommendedCount) * 100) : 0;
    const closeRate = recommendedCount > 0 ? Math.round((paidCount / recommendedCount) * 100) : 0;
    const performanceScore = computeOfferPerformanceScore({
      recommendedCount,
      acceptedCount,
      paidCount,
      avgOrderValue,
    });

    await storage.createOfferPerformanceSnapshot({
      offerSlug: row.offer_slug ?? "unknown",
      intent: row.intent ?? null,
      sourceName: row.source_name ?? null,
      recommendedCount,
      acceptedCount,
      paidCount,
      acceptanceRate,
      closeRate,
      avgOrderValue,
      performanceScore,
    });

    created++;
  }

  return {
    summary: `created ${created} offer performance snapshots`,
    meta: { created },
  };
}
