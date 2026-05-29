// Phase 65 — Revenue Intelligence: enhanced revenue forecasting.
//
// Builds on the Phase 64 deterministic OLS forecaster but adds multi-horizon
// revenue projections (7 / 30 / 90 days) with low/expected/high scenario bands
// derived from the regression fit quality (R²). No LLM, no external calls —
// reproducible and recommendation-only.

export type RevenuePoint = { date: string; revenueCents: number };

export type HorizonForecast = {
  horizonDays: number;
  label: string;
  current: number;      // trailing window total (same length as horizon, capped at series length)
  projected: number;    // expected projection for the horizon
  low: number;          // conservative band
  high: number;         // optimistic band
  changePct: number;    // projected vs current
  trend: "up" | "down" | "flat";
  confidence: number;   // 0-100 from R²
};

export type RevenueForecast = {
  horizons: HorizonForecast[];
  dailyRunRateCents: number;     // fitted run-rate at the latest point
  series: RevenuePoint[];
};

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

function trendOf(changePct: number): "up" | "down" | "flat" {
  if (changePct > 3) return "up";
  if (changePct < -3) return "down";
  return "flat";
}

function pct(current: number, projected: number): number {
  if (current === 0) return projected > 0 ? 100 : 0;
  return Math.round(((projected - current) / current) * 1000) / 10;
}

function projectHorizon(ys: number[], horizon: number, r2: number, slope: number, intercept: number): { projected: number; current: number } {
  const n = ys.length;
  const current = ys.slice(-horizon).reduce((a, b) => a + b, 0);
  let projected = 0;
  for (let i = n; i < n + horizon; i++) projected += Math.max(0, slope * i + intercept);
  return { projected: Math.round(projected), current };
}

export function computeRevenueForecast(series: RevenuePoint[]): RevenueForecast {
  const ys = series.map((p) => p.revenueCents);
  const { slope, intercept, r2 } = linreg(ys);
  const n = ys.length;
  const confidence = Math.round(r2 * 100);
  // Band width shrinks as confidence rises: high R² → tighter bands.
  const bandFactor = 0.15 + 0.45 * (1 - r2); // 0.15 (perfect) … 0.60 (no fit)

  const dailyRunRateCents = Math.max(0, Math.round(slope * (n - 1) + intercept));

  const horizons: HorizonForecast[] = [
    { days: 7, label: "Next 7 days" },
    { days: 30, label: "Next 30 days" },
    { days: 90, label: "Next 90 days" },
  ].map(({ days, label }) => {
    const { projected, current } = projectHorizon(ys, days, r2, slope, intercept);
    const changePct = pct(current, projected);
    return {
      horizonDays: days,
      label,
      current,
      projected,
      low: Math.max(0, Math.round(projected * (1 - bandFactor))),
      high: Math.round(projected * (1 + bandFactor)),
      changePct,
      trend: trendOf(changePct),
      confidence,
    };
  });

  return { horizons, dailyRunRateCents, series };
}
