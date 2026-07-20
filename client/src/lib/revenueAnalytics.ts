// Phase 72.3 — client-side revenue engagement tracker.
// Anonymous-only engagement signals (affiliate clicks, ad views, AI
// recommendation clicks). These NEVER carry money — the server forces
// amountCents to 0 for unauthenticated callers and rejects economic event
// types with 403. Reuses the Phase 72.2 visitor/session/attribution identity
// keys so revenue engagement joins the same anonymous journey.

import type { ClientRevenueEvent, RevenueSource } from "@shared/schema";

const VISITOR_KEY = "e360_visitor_id";
const SESSION_KEY = "e360_funnel_session";
const ATTRIBUTION_KEY = "e360_funnel_attribution";

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingPage?: string;
};

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function getAttribution(): Attribution {
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;

    const params = new URLSearchParams(window.location.search);
    const attr: Attribution = {
      source: params.get("utm_source") ?? undefined,
      medium: params.get("utm_medium") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      referrer: document.referrer || undefined,
      landingPage: window.location.pathname,
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return {};
  }
}

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\/|Opera/.test(ua)) return "opera";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "safari";
  if (/Firefox\//.test(ua)) return "firefox";
  return "other";
}

/** Fire-and-forget revenue engagement event. Never throws, never blocks the UI. */
export function trackRevenueEvent(
  event: ClientRevenueEvent,
  revenueSource: RevenueSource,
  extra?: {
    productName?: string;
    page?: string;
    metadata?: Record<string, unknown>;
  },
): void {
  try {
    const attribution = getAttribution();
    const body = {
      event,
      revenueSource,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      page: extra?.page ?? window.location.pathname,
      landingPage: attribution.landingPage,
      referrer: attribution.referrer,
      utmSource: attribution.source,
      utmMedium: attribution.medium,
      utmCampaign: attribution.campaign,
      device: getDevice(),
      browser: getBrowser(),
      productName: extra?.productName,
      metadata: extra?.metadata,
    };
    fetch("/api/analytics/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}
