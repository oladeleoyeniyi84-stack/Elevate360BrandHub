// Phase 65 — Revenue Intelligence: Customer Lifetime Value analytics.
//
// Deterministic, dependency-free derivations over the snapshot CLV block.
// Adds value segmentation and concentration metrics. Recommendation-only.

import type { RevenueSnapshot } from "./aggregator";

export type ClvAnalytics = {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  avgLtvCents: number;
  medianLtvCents: number;
  avgOrdersPerCustomer: number;
  // Share of total revenue contributed by the top 20% of customers (Pareto).
  top20RevenueSharePct: number;
  segments: Array<{ tier: string; customers: number; revenueCents: number; sharePct: number }>;
  topCustomers: Array<{ label: string; orders: number; totalCents: number; firstOrder: string; lastOrder: string }>;
  cohorts: Array<{ month: string; customers: number; revenueCents: number }>;
};

export function computeClvAnalytics(snap: RevenueSnapshot): ClvAnalytics {
  const clv = snap.clv;
  const totalRevenue = clv.topCustomers.reduce((s, c) => s + c.totalCents, 0);

  // Build value tiers from the top-customers list (best available granularity).
  const sorted = [...clv.topCustomers].sort((a, b) => b.totalCents - a.totalCents);
  const top20Count = Math.max(1, Math.ceil(sorted.length * 0.2));
  const top20Revenue = sorted.slice(0, top20Count).reduce((s, c) => s + c.totalCents, 0);
  const allCustomersRevenue = clv.cohorts.reduce((s, c) => s + c.revenueCents, 0) || totalRevenue;
  const top20RevenueSharePct = allCustomersRevenue > 0
    ? Math.round((top20Revenue / allCustomersRevenue) * 1000) / 10
    : 0;

  // Value tiers relative to average LTV.
  const avg = clv.avgLtvCents || 1;
  const tiers = { vip: 0, high: 0, mid: 0, low: 0 };
  const tierRev = { vip: 0, high: 0, mid: 0, low: 0 };
  for (const c of clv.topCustomers) {
    const ratio = c.totalCents / avg;
    const t = ratio >= 3 ? "vip" : ratio >= 1.5 ? "high" : ratio >= 0.5 ? "mid" : "low";
    tiers[t] += 1;
    tierRev[t] += c.totalCents;
  }
  const tierTotal = tierRev.vip + tierRev.high + tierRev.mid + tierRev.low || 1;
  const segments = [
    { tier: "VIP (3x+ avg)", customers: tiers.vip, revenueCents: tierRev.vip, sharePct: Math.round((tierRev.vip / tierTotal) * 1000) / 10 },
    { tier: "High (1.5–3x)", customers: tiers.high, revenueCents: tierRev.high, sharePct: Math.round((tierRev.high / tierTotal) * 1000) / 10 },
    { tier: "Mid (0.5–1.5x)", customers: tiers.mid, revenueCents: tierRev.mid, sharePct: Math.round((tierRev.mid / tierTotal) * 1000) / 10 },
    { tier: "Low (<0.5x)", customers: tiers.low, revenueCents: tierRev.low, sharePct: Math.round((tierRev.low / tierTotal) * 1000) / 10 },
  ];

  return {
    totalCustomers: clv.totalCustomers,
    repeatCustomers: clv.repeatCustomers,
    repeatRate: clv.repeatRate,
    avgLtvCents: clv.avgLtvCents,
    medianLtvCents: clv.medianLtvCents,
    avgOrdersPerCustomer: clv.avgOrdersPerCustomer,
    top20RevenueSharePct,
    segments,
    topCustomers: clv.topCustomers,
    cohorts: clv.cohorts,
  };
}
