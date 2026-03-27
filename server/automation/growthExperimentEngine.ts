import { storage } from "../storage";
import { computeExperimentImpactScore } from "../services/growthScoring";

function keyify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function runGrowthExperimentEngine() {
  const sources = await storage.getLatestSourcePerformance(20);
  const leaks = await storage.getLatestFunnelLeaks(10);
  const offers = await storage.getLatestOfferPerformance(20);

  let created = 0;

  const weakSource = [...sources].sort((a, b) => a.qualityScore - b.qualityScore)[0];
  if (weakSource) {
    await storage.createGrowthExperiment({
      experimentKey: `source-${keyify(weakSource.sourceName)}-${Date.now()}`,
      title: `Improve conversion from ${weakSource.sourceName}`,
      area: "source",
      hypothesis: `${weakSource.sourceName} brings traffic but underperforms on lead quality or revenue.`,
      proposedChange: `Adjust CTA path or landing-page message for ${weakSource.sourceName} traffic.`,
      evidenceJson: weakSource as any,
      expectedImpactScore: computeExperimentImpactScore({
        performanceScore: 100 - weakSource.qualityScore,
      }),
      status: "proposed",
    });
    created++;
  }

  const topLeak = leaks[0];
  if (topLeak) {
    await storage.createGrowthExperiment({
      experimentKey: `funnel-${keyify(topLeak.leakStage)}-${Date.now()}`,
      title: `Reduce leak at ${topLeak.leakStage}`,
      area: "funnel",
      hypothesis: `${topLeak.leakStage} is the biggest current funnel dropoff.`,
      proposedChange: topLeak.recommendedFix || `Test improved CTA and offer sequencing for ${topLeak.leakStage}.`,
      evidenceJson: topLeak as any,
      expectedImpactScore: computeExperimentImpactScore({
        severityScore: topLeak.severityScore,
      }),
      status: "proposed",
    });
    created++;
  }

  const weakOffer = [...offers].sort((a, b) => a.performanceScore - b.performanceScore)[0];
  if (weakOffer) {
    await storage.createGrowthExperiment({
      experimentKey: `offer-${keyify(weakOffer.offerSlug)}-${Date.now()}`,
      title: `Improve offer ${weakOffer.offerSlug}`,
      area: "offer",
      hypothesis: `${weakOffer.offerSlug} is being recommended but under-closing.`,
      proposedChange: `Change offer ordering, override logic, or CTA copy for ${weakOffer.offerSlug}.`,
      evidenceJson: weakOffer as any,
      expectedImpactScore: computeExperimentImpactScore({
        performanceScore: 100 - weakOffer.performanceScore,
        revenueAtRisk: weakOffer.avgOrderValue,
      }),
      status: "proposed",
    });
    created++;
  }

  return {
    summary: `created ${created} growth experiments`,
    meta: { created },
  };
}
