// Phase 64 — Founder Intelligence: predictive intelligence.
//
// Deterministic, dependency-free forecasting using ordinary least-squares
// linear regression over the recent daily series. Confidence is derived from
// the coefficient of determination (R²). No LLM, no external calls — safe and
// reproducible. Recommendation-only signal.

export type Forecast = {
  metric: "revenue" | "leads" | "traffic" | "conversion";
  label: string;
  unit: "currency" | "count" | "percent";
  current: number;       // most recent 7-day total (or rate)
  projectedNext7: number; // projected next 7-day total (or rate)
  changePct: number;     // projected vs current, %
  trend: "up" | "down" | "flat";
  confidence: number;    // 0-100 from R²
};

type Point = { date: string; visits: number; leads: number; conversions: number; revenueCents: number };

function linreg(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = slope * i + intercept;
    ssTot += (ys[i] - meanY) ** 2;
    ssRes += (ys[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2 };
}

// Project the sum of the next 7 daily values from the fitted line.
function projectNext7(ys: number[]): { current: number; projected: number; r2: number } {
  const { slope, intercept, r2 } = linreg(ys);
  const n = ys.length;
  const current = ys.slice(-7).reduce((a, b) => a + b, 0);
  let projected = 0;
  for (let i = n; i < n + 7; i++) projected += Math.max(0, slope * i + intercept);
  return { current, projected: Math.round(projected), r2 };
}

function trendOf(changePct: number): "up" | "down" | "flat" {
  if (changePct > 3) return "up";
  if (changePct < -3) return "down";
  return "flat";
}

function pct(current: number, projected: number): number {
  if (current === 0) return projected > 0 ? 100 : 0;
  return Math.round(((projected - current) / current) * 1000) / 10;
}

export function computeForecasts(series: Point[]): Forecast[] {
  const visits = series.map((p) => p.visits);
  const leads = series.map((p) => p.leads);
  const conv = series.map((p) => p.conversions);
  const revenue = series.map((p) => p.revenueCents);

  const out: Forecast[] = [];

  {
    const { current, projected, r2 } = projectNext7(revenue);
    const changePct = pct(current, projected);
    out.push({
      metric: "revenue", label: "Revenue (next 7 days)", unit: "currency",
      current, projectedNext7: projected, changePct, trend: trendOf(changePct),
      confidence: Math.round(r2 * 100),
    });
  }
  {
    const { current, projected, r2 } = projectNext7(leads);
    const changePct = pct(current, projected);
    out.push({
      metric: "leads", label: "New leads (next 7 days)", unit: "count",
      current, projectedNext7: projected, changePct, trend: trendOf(changePct),
      confidence: Math.round(r2 * 100),
    });
  }
  {
    const { current, projected, r2 } = projectNext7(visits);
    const changePct = pct(current, projected);
    out.push({
      metric: "traffic", label: "Traffic (next 7 days)", unit: "count",
      current, projectedNext7: projected, changePct, trend: trendOf(changePct),
      confidence: Math.round(r2 * 100),
    });
  }
  {
    // Conversion rate = conversions / visits, as a rolling percentage.
    const rateSeries = series.map((p) => (p.visits > 0 ? (p.conversions / p.visits) * 100 : 0));
    const { slope, intercept, r2 } = linreg(rateSeries);
    const n = rateSeries.length;
    const current = Math.round((rateSeries.slice(-7).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(7, n))) * 100) / 100;
    const projected = Math.max(0, Math.round((slope * (n + 3) + intercept) * 100) / 100);
    const changePct = pct(current, projected);
    out.push({
      metric: "conversion", label: "Conversion rate (projected)", unit: "percent",
      current, projectedNext7: projected, changePct, trend: trendOf(changePct),
      confidence: Math.round(r2 * 100),
    });
  }

  return out;
}
