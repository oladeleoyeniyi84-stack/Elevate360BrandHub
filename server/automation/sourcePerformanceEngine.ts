import { storage } from "../storage";
import { computeSourceQualityScore } from "../services/growthScoring";

export async function runSourcePerformanceEngine() {
  const result: any = await storage.getSourcePerformanceCandidates(14);
  const rows = result.rows ?? result;

  let created = 0;

  for (const row of rows) {
    const qualityScore = computeSourceQualityScore({
      visits: Number(row.visits ?? 0),
      qualifiedLeads: Number(row.qualified_leads ?? 0),
      bookings: Number(row.bookings ?? 0),
      paidOrders: Number(row.paid_orders ?? 0),
      revenue: Number(row.revenue ?? 0),
    });

    await storage.createSourcePerformanceSnapshot({
      sourceName: row.source_name ?? "unknown",
      visits: Number(row.visits ?? 0),
      chatLeads: Number(row.chat_leads ?? 0),
      qualifiedLeads: Number(row.qualified_leads ?? 0),
      bookings: Number(row.bookings ?? 0),
      paidOrders: Number(row.paid_orders ?? 0),
      revenue: Number(row.revenue ?? 0),
      avgOrderValue: Number(row.avg_order_value ?? 0),
      recoveryWinRate: 0,
      qualityScore,
    });

    created++;
  }

  return {
    summary: `created ${created} source performance snapshots`,
    meta: { created },
  };
}
