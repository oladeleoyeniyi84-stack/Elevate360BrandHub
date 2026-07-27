// Phase 72.4R — first-party Core Web Vitals collection (field data / RUM).
// Uses the standard `web-vitals` library; final metric values are delivered by
// the library on visibility change / pagehide and sent via sendBeacon so they
// survive navigation. The server stamps source='rum_field' — this client
// cannot (and does not) label data.

import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

const ENDPOINT = "/api/analytics/web-vitals";
const SESSION_KEY = "e360_funnel_session";

let initialized = false;
const sentIds = new Set<string>();

function deviceClass(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  return "desktop";
}

function sessionId(): string | undefined {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v && v.trim() ? v : undefined;
  } catch {
    return undefined;
  }
}

function report(metric: Metric): void {
  try {
    if (sentIds.has(metric.id)) return;
    sentIds.add(metric.id);
    const value =
      metric.name === "CLS"
        ? Math.round(metric.value * 1000) / 1000
        : Math.round(metric.value);
    const payload = JSON.stringify({
      metric: metric.name.toLowerCase(),
      value,
      page: window.location.pathname,
      device: deviceClass(),
      sessionId: sessionId(),
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon || !navigator.sendBeacon(ENDPOINT, blob)) {
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Observability must never break the page.
  }
}

/** Idempotent — safe to call from the app root; registers observers once. */
export function initWebVitals(): void {
  if (initialized) return;
  initialized = true;
  try {
    onLCP(report);
    onINP(report);
    onCLS(report);
  } catch {
    // Browsers without PerformanceObserver support — silently skip.
  }
}
