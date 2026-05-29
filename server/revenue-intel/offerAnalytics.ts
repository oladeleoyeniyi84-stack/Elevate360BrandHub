// Phase 65 — Revenue Intelligence: Offer Performance Analytics.
//
// Combines attributed revenue per offer with concierge recommendation
// acceptance rates to rank offers by realised value. Deterministic.

import type { RevenueSnapshot } from "./aggregator";

export type OfferPerformance = {
  name: string;
  revenueCents: number;
  units: number;
  avgValueCents: number;
  revenueSharePct: number;
  recommended: number;     // times the concierge recommended this offer
  accepted: number;        // times accepted
  acceptanceRate: number;  // %
};

export type OfferAnalytics = {
  offers: OfferPerformance[];
  totalOfferRevenueCents: number;
  bestSeller: OfferPerformance | null;
  highestAvgValue: OfferPerformance | null;
  bestAcceptance: OfferPerformance | null;
};

export function computeOfferAnalytics(snap: RevenueSnapshot): OfferAnalytics {
  const byOffer = snap.attribution.byOffer ?? [];
  const perOffer = snap.offers.perOffer ?? {};
  const totalOfferRevenueCents = byOffer.reduce((s, o) => s + (o.revenue || 0), 0);

  // Match attributed offers to recommendation stats by case-insensitive name.
  const recLookup = new Map<string, { recommended: number; accepted: number; acceptanceRate: number }>();
  for (const [name, stats] of Object.entries(perOffer)) {
    recLookup.set(name.toLowerCase().trim(), stats);
  }

  const offers: OfferPerformance[] = byOffer.map((o) => {
    const rec = recLookup.get((o.name || "").toLowerCase().trim());
    return {
      name: o.name,
      revenueCents: o.revenue || 0,
      units: o.count || 0,
      avgValueCents: o.avgValue || (o.count ? Math.round((o.revenue || 0) / o.count) : 0),
      revenueSharePct: totalOfferRevenueCents > 0 ? Math.round(((o.revenue || 0) / totalOfferRevenueCents) * 1000) / 10 : 0,
      recommended: rec?.recommended ?? 0,
      accepted: rec?.accepted ?? 0,
      acceptanceRate: rec?.acceptanceRate ?? 0,
    };
  });

  // Include offers that were recommended but have no attributed revenue yet.
  const known = new Set(offers.map((o) => o.name.toLowerCase().trim()));
  for (const [name, stats] of Object.entries(perOffer)) {
    if (!known.has(name.toLowerCase().trim())) {
      offers.push({
        name, revenueCents: 0, units: 0, avgValueCents: 0, revenueSharePct: 0,
        recommended: stats.recommended, accepted: stats.accepted, acceptanceRate: stats.acceptanceRate,
      });
    }
  }

  const sortedByRev = [...offers].sort((a, b) => b.revenueCents - a.revenueCents);
  const sortedByAvg = [...offers].filter((o) => o.units > 0).sort((a, b) => b.avgValueCents - a.avgValueCents);
  const sortedByAcc = [...offers].filter((o) => o.recommended >= 3).sort((a, b) => b.acceptanceRate - a.acceptanceRate);

  return {
    offers: sortedByRev,
    totalOfferRevenueCents,
    bestSeller: sortedByRev[0] ?? null,
    highestAvgValue: sortedByAvg[0] ?? null,
    bestAcceptance: sortedByAcc[0] ?? null,
  };
}
