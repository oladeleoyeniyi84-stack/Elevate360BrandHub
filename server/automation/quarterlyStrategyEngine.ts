import { storage } from "../storage";

export async function runQuarterlyStrategyEngine(): Promise<{ created: boolean; summary: string }> {
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = now;

  // Gather cross-platform data
  const experiments = await storage.getGrowthExperiments(50);
  const sources = await storage.getLatestSourcePerformance(20);
  const offers = await storage.getLatestOfferPerformance(20);
  const leaks = await storage.getLatestFunnelLeaks(10);
  const rollbacks = await storage.getRollbackEvents(20);
  const changes = await storage.getAppliedChanges(50);
  const orderStats = await storage.getOrderStats();

  const wonExps = experiments.filter((e) => e.status === "won");
  const lostExps = experiments.filter((e) => e.status === "lost");
  const topSource = sources.sort((a, b) => b.qualityScore - a.qualityScore)[0];
  const topOffer = offers.sort((a, b) => b.performanceScore - a.performanceScore)[0];
  const biggestLeak = leaks.sort((a, b) => b.severityScore - a.severityScore)[0];

  const recommendations: string[] = [];

  if (wonExps.length > 0) {
    recommendations.push(`Scale experiments similar to "${wonExps[0].title}" — proven to work.`);
  }
  if (topSource) {
    recommendations.push(`Increase traffic from "${topSource.sourceName}" — highest quality score (${topSource.qualityScore}).`);
  }
  if (topOffer) {
    recommendations.push(`Promote "${topOffer.offerSlug}" more aggressively — top performer (score: ${topOffer.performanceScore}).`);
  }
  if (biggestLeak) {
    recommendations.push(`Fix "${biggestLeak.leakStage}" funnel leak — severity ${biggestLeak.severityScore}, ${biggestLeak.dropoffRate}% drop-off.`);
  }
  if (lostExps.length > wonExps.length) {
    recommendations.push(`Review experiment strategy — more losses (${lostExps.length}) than wins (${wonExps.length}).`);
  }
  if (rollbacks.length > 5) {
    recommendations.push(`Review execution policies — ${rollbacks.length} rollbacks this quarter suggests over-aggressive auto-apply.`);
  }
  recommendations.push(`Revenue this quarter: ${orderStats.paid} paid orders, $${(orderStats.revenue / 100).toFixed(2)} total revenue.`);

  const summary = [
    `Quarterly Strategy Report — Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`,
    ``,
    `Overview:`,
    `• ${wonExps.length} winning experiments, ${lostExps.length} losing`,
    `• ${changes.length} AI-applied changes, ${rollbacks.length} rollbacks`,
    `• Top source: ${topSource?.sourceName ?? "N/A"} | Top offer: ${topOffer?.offerSlug ?? "N/A"}`,
    `• Revenue: ${orderStats.paid} paid orders | $${(orderStats.revenue / 100).toFixed(2)}`,
    ``,
    `Strategic Recommendations:`,
    ...recommendations.map((r, i) => `${i + 1}. ${r}`),
  ].join("\n");

  const report = await storage.createQuarterlyStrategyReport({
    periodStart: quarterStart,
    periodEnd: quarterEnd,
    summary,
    recommendationsJson: recommendations,
  });

  console.log(`[quarterlyStrategy] created report id=${report.id} for Q${Math.floor(quarterStart.getMonth() / 3) + 1}`);
  return { created: true, summary };
}
