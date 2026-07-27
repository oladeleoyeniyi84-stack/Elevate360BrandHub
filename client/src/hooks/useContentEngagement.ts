// Phase 72.4 — content engagement milestones feeding the Authority Index.
// Mount on a content page (blog post / knowledge article): fires content_view
// immediately, content_read at ≥50% max scroll depth, and content_complete at
// ≥90% depth with ≥30s dwell. All events are fire-and-forget, deduped per
// session+content client-side AND server-side; a null slug is a no-op so the
// hook can be called unconditionally while data loads.

import { useEffect } from "react";
import { trackContentEvent } from "@/lib/searchIntelligence";
import type { SearchContentType } from "@shared/schema";

const READ_THRESHOLD_PCT = 50;
const COMPLETE_THRESHOLD_PCT = 90;
const COMPLETE_MIN_DWELL_SEC = 30;
const EVALUATE_INTERVAL_MS = 5000;

export function useContentEngagement(slug: string | null, contentType: SearchContentType): void {
  useEffect(() => {
    if (!slug) return;
    try {
      const startedAt = Date.now();
      let maxPct = 0;
      let sentRead = false;
      let sentComplete = false;

      const currentPct = (): number => {
        const doc = document.documentElement;
        const scrollable = Math.max(doc.scrollHeight - window.innerHeight, 0);
        if (scrollable <= 0) return 100; // content fits the viewport
        return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
      };
      const dwellSeconds = (): number =>
        Math.min(14400, Math.max(0, Math.round((Date.now() - startedAt) / 1000)));

      const evaluate = () => {
        try {
          maxPct = Math.max(maxPct, currentPct());
          if (!sentRead && maxPct >= READ_THRESHOLD_PCT) {
            sentRead = true;
            trackContentEvent("content_read", slug, contentType, {
              readPercent: maxPct,
              dwellSeconds: dwellSeconds(),
            });
          }
          if (!sentComplete && maxPct >= COMPLETE_THRESHOLD_PCT && dwellSeconds() >= COMPLETE_MIN_DWELL_SEC) {
            sentComplete = true;
            trackContentEvent("content_complete", slug, contentType, {
              readPercent: maxPct,
              dwellSeconds: dwellSeconds(),
            });
          }
        } catch {
          // analytics must never break the page
        }
      };

      trackContentEvent("content_view", slug, contentType);

      const onScroll = () => evaluate();
      window.addEventListener("scroll", onScroll, { passive: true });
      // Interval covers dwell-gated completion and short pages with no scroll.
      const timer = window.setInterval(evaluate, EVALUATE_INTERVAL_MS);
      evaluate();

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.clearInterval(timer);
      };
    } catch {
      // analytics must never break the page
      return;
    }
  }, [slug, contentType]);
}
