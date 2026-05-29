// Phase 66 — Growth Automation: conversion forecasting.
//
// Deterministic OLS forecast of the daily conversion rate (conversions / visits)
// with multi-horizon projections (7 / 30 / 90 days) and scenario bands derived
// from regression fit quality (R²). No LLM, no external calls — reproducible and
// recommendation-only. Mirrors the Phase 65 revenue forecaster.

export type ConversionPoint = { date: string; visits: number; conversions: number };

export type ConversionHorizon = {
  horizonDays: number;
  label: string;
  current: number;     // trailing-window conversion rate (%)
  projected: number;   // expected conversion rate (%)
  low: number;
  high: number;
  changePct: number;
  trend: "up" | "down" | "flat";
  confidence: number;  // 0-100 from R²
};

export type ConversionForecast = {
  horizons: ConversionHorizon[];
  currentRatePct: number;
  series: Array<{ date: string; ratePct: number }>;
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeConversionForecast(points: ConversionPoint[]): ConversionForecast {
  // Daily conversion rate as a percentage. Days with no visits contribute 0.
  const rates = points.map((p) => (p.visits > 0 ? (p.conversions / p.visits) * 100 : 0));
  const { slope, intercept, r2 } = linreg(rates);
  const n = rates.length;
  const confidence = Math.round(r2 * 100);
  const bandFactor = 0.15 + 0.45 * (1 - r2);

  const currentRatePct = n > 0 ? round1(Math.max(0, slope * (n - 1) + intercept)) : 0;

  const horizons: ConversionHorizon[] = [
    { days: 7, label: "Next 7 days" },
    { days: 30, label: "Next 30 days" },
    { days: 90, label: "Next 90 days" },
  ].map(({ days, label }) => {
    const window = rates.slice(-days);
    const current = window.length > 0 ? round1(window.reduce((a, b) => a + b, 0) / window.length) : 0;
    // Mean projected daily rate across the horizon.
    let acc = 0;
    for (let i = n; i < n + days; i++) acc += Math.max(0, slope * i + intercept);
    const projected = round1(days > 0 ? acc / days : 0);
    const changePct = pct(current, projected);
    return {
      horizonDays: days,
      label,
      current,
      projected,
      low: round1(Math.max(0, projected * (1 - bandFactor))),
      high: round1(projected * (1 + bandFactor)),
      changePct,
      trend: trendOf(changePct),
      confidence,
    };
  });

  return {
    horizons,
    currentRatePct,
    series: points.map((p, i) => ({ date: p.date, ratePct: round1(rates[i]) })),
  };
}
