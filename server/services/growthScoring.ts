export function computeSourceQualityScore(input: {
  visits: number;
  qualifiedLeads: number;
  bookings: number;
  paidOrders: number;
  revenue: number;
}) {
  const qualifiedRate = input.visits > 0 ? input.qualifiedLeads / input.visits : 0;
  const bookingRate = input.visits > 0 ? input.bookings / input.visits : 0;
  const paidRate = input.visits > 0 ? input.paidOrders / input.visits : 0;
  const revenueFactor = Math.min(40, Math.floor(input.revenue / 100));
  return Math.round(qualifiedRate * 35 + bookingRate * 25 + paidRate * 30 + revenueFactor);
}

export function computeOfferPerformanceScore(input: {
  recommendedCount: number;
  acceptedCount: number;
  paidCount: number;
  avgOrderValue: number;
}) {
  const acceptanceRate = input.recommendedCount > 0 ? input.acceptedCount / input.recommendedCount : 0;
  const closeRate = input.recommendedCount > 0 ? input.paidCount / input.recommendedCount : 0;
  const valueFactor = Math.min(30, Math.floor(input.avgOrderValue / 100));
  return Math.round(acceptanceRate * 40 + closeRate * 30 + valueFactor);
}

export function computeLeakSeverityScore(input: {
  fromCount: number;
  toCount: number;
}) {
  if (input.fromCount <= 0) return 0;
  const dropoff = input.fromCount - input.toCount;
  const rate = dropoff / input.fromCount;
  return Math.max(0, Math.round(rate * 100));
}

export function computeExperimentImpactScore(input: {
  severityScore?: number;
  performanceScore?: number;
  revenueAtRisk?: number;
}) {
  return Math.min(
    100,
    Math.round(
      (input.severityScore ?? 0) * 0.45 +
      (input.performanceScore ?? 0) * 0.35 +
      Math.min(100, (input.revenueAtRisk ?? 0) / 100) * 0.20
    )
  );
}
