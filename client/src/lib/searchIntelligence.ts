// Phase 72.4 — client-side Search Intelligence tracker.
// Anonymous-only landing attribution + content engagement signals. Reuses the
// EXACT Phase 72.2 identity keys (e360_visitor_id / e360_funnel_session) so
// search landings join to funnel (72.2) and revenue (72.3) events by session id
// in the founder dashboard. Fire-and-forget: never throws, never blocks the UI.
// Trust boundary: this client can never set dedupe keys or authority values —
// idempotency keys are derived server-side and the Authority Index is SQL-only.

import type { SearchIntelEvent, SearchTrafficSource, SearchContentType } from "@shared/schema";

const VISITOR_KEY = "e360_visitor_id"; // shared with 72.2/72.3
const SESSION_KEY = "e360_funnel_session"; // shared with 72.2/72.3
const ATTRIBUTION_KEY = "e360_funnel_attribution"; // shared first-touch cache (72.2 shape)
const LANDING_SENT_KEY = "e360_search_landing_sent";
const CONTENT_GUARD_PREFIX = "e360_sil_"; // per-session client-side resend guard

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

// First-touch attribution for the session — identical key + shape + capture
// logic as Phase 72.2's tracker, so whichever tracker runs first caches the
// same value and both stay consistent.
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

// ─── Traffic-source classification ──────────────────────────────────────────

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

const AI_ASSISTANT_HOSTS = [
  "chatgpt.com", "chat.openai.com", "perplexity.ai", "claude.ai",
  "gemini.google.com", "bard.google.com", "copilot.microsoft.com",
  "you.com", "phind.com", "poe.com", "meta.ai",
];
const OTHER_SEARCH_HOSTS = [
  "ecosia.org", "qwant.com", "startpage.com", "search.brave.com",
  "mojeek.com", "kagi.com",
];
const SOCIAL_HOSTS = [
  "facebook.com", "m.facebook.com", "instagram.com", "twitter.com", "x.com",
  "t.co", "linkedin.com", "lnkd.in", "reddit.com", "youtube.com", "youtu.be",
  "tiktok.com", "threads.net", "whatsapp.com", "wa.me", "snapchat.com",
];

function matchSourceByHost(host: string): SearchTrafficSource | null {
  const has = (s: string) => host === s || host.endsWith(`.${s}`);
  // AI assistants first — gemini/bard live on google.com subdomains.
  if (AI_ASSISTANT_HOSTS.some(has)) return "ai_assistant";
  if (/(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return "google";
  if (has("bing.com")) return "bing";
  if (has("duckduckgo.com")) return "duckduckgo";
  if (/(^|\.)yahoo\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return "yahoo";
  if (/(^|\.)yandex\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return "yandex";
  if (OTHER_SEARCH_HOSTS.some(has) || /(^|\.)baidu\./.test(host) || host.includes("searx")) return "other_search";
  if (SOCIAL_HOSTS.some(has) || /(^|\.)pinterest\./.test(host)) return "social";
  return null;
}

// Common utm_source names (not hosts) → closed vocabulary.
const UTM_SOURCE_ALIASES: Record<string, SearchTrafficSource> = {
  google: "google", bing: "bing", duckduckgo: "duckduckgo", yahoo: "yahoo", yandex: "yandex",
  facebook: "social", fb: "social", instagram: "social", ig: "social", twitter: "social",
  x: "social", linkedin: "social", youtube: "social", tiktok: "social", pinterest: "social",
  reddit: "social", threads: "social", whatsapp: "social",
  chatgpt: "ai_assistant", openai: "ai_assistant", perplexity: "ai_assistant",
  gemini: "ai_assistant", copilot: "ai_assistant", claude: "ai_assistant",
};

/** Classify a session's entry into the closed SEARCH_TRAFFIC_SOURCES vocabulary. */
export function classifyTrafficSource(
  referrer: string | undefined,
  utmSource: string | undefined,
  utmMedium: string | undefined,
  liveParams: URLSearchParams,
): { source: SearchTrafficSource; referrerHost?: string } {
  const referrerHost = hostOf(referrer);
  const medium = (utmMedium ?? "").toLowerCase();
  const src = (utmSource ?? "").toLowerCase();

  // Paid signals win — ad clicks arrive from search/social hosts.
  if (
    liveParams.get("gclid") || liveParams.get("msclkid") ||
    ["cpc", "ppc", "paid", "paid_social", "display", "ads"].includes(medium)
  ) {
    return { source: "paid", referrerHost };
  }
  if (["email", "newsletter"].includes(medium) || ["email", "newsletter", "resend"].includes(src)) {
    return { source: "email", referrerHost };
  }

  const ownHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  if (referrerHost && referrerHost !== ownHost) {
    const matched = matchSourceByHost(referrerHost);
    return { source: matched ?? "referral", referrerHost };
  }

  // No external referrer: UTM-tagged → mapped alias or generic referral; else direct.
  if (src) return { source: UTM_SOURCE_ALIASES[src] ?? "referral" };
  return { source: "direct" };
}

// ─── Transport ───────────────────────────────────────────────────────────────

function send(body: Record<string, unknown>): void {
  try {
    fetch("/api/analytics/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        ...body,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}

/**
 * Fire the once-per-session search landing classification. Client-side flag +
 * server-side dedupe key both guard repeats; safe to call on every app mount.
 */
export function trackSearchLanding(): void {
  try {
    try {
      if (sessionStorage.getItem(LANDING_SENT_KEY)) return;
      sessionStorage.setItem(LANDING_SENT_KEY, "1");
    } catch {
      // storage blocked → still record; server counts it as unattributed session
    }
    const attr = getAttribution();
    const liveParams = new URLSearchParams(window.location.search);
    const { source, referrerHost } = classifyTrafficSource(
      attr.referrer, attr.source, attr.medium, liveParams,
    );
    send({
      event: "search_landing" satisfies SearchIntelEvent,
      trafficSource: source,
      referrerHost,
      landingPath: (attr.landingPage ?? window.location.pathname).slice(0, 600),
      page: window.location.pathname,
      utmSource: attr.source,
      utmMedium: attr.medium,
      utmCampaign: attr.campaign,
      device: getDevice(),
      browser: getBrowser(),
    });
  } catch {
    // analytics must never break the page
  }
}

/** Fire-and-forget content engagement event (view/read/complete deduped per session+content). */
export function trackContentEvent(
  event: Exclude<SearchIntelEvent, "search_landing">,
  contentSlug: string,
  contentType: SearchContentType,
  extra: { readPercent?: number; dwellSeconds?: number; shareChannel?: string } = {},
): void {
  try {
    if (!contentSlug) return;
    if (event !== "content_share") {
      // Client-side per-session guard (server dedupe key is the authority).
      const guardKey = `${CONTENT_GUARD_PREFIX}${event}:${contentSlug}`;
      try {
        if (sessionStorage.getItem(guardKey)) return;
        sessionStorage.setItem(guardKey, "1");
      } catch {
        // storage blocked → rely on server-side handling
      }
    }
    send({
      event,
      contentSlug: contentSlug.slice(0, 300),
      contentType,
      page: window.location.pathname,
      device: getDevice(),
      browser: getBrowser(),
      ...extra,
    });
  } catch {
    // analytics must never break the page
  }
}

/** Share-intent click on a piece of content. */
export function trackContentShare(contentSlug: string, contentType: SearchContentType, shareChannel?: string): void {
  trackContentEvent("content_share", contentSlug, contentType, { shareChannel });
}
