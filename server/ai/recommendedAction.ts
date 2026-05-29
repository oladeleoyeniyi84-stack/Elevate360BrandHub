import type { Consultation } from "@shared/schema";

/**
 * Concierge 2.0 — turns a stored `recommendedOffer` string (from lead scoring)
 * into a concrete, clickable action the chat widget can render: either an
 * in-app booking (consultation) or a Stripe checkout (live offer). Falls back
 * to a generic "book a session" prompt when nothing specific matches.
 *
 * Pure + defensive: never throws, returns null when there is nothing to suggest.
 */

export type RecommendedAction =
  | {
      type: "booking";
      consultationId: number;
      title: string;
      price: number; // cents
      currency: string;
      ctaText: string;
      confidence: number;
    }
  | {
      type: "offer";
      priceId: string;
      name: string;
      amount: number; // cents
      currency: string;
      ctaText: string;
      confidence: number;
    }
  | {
      type: "book_session";
      ctaText: string;
      confidence: number;
    };

export type OfferLike = {
  priceId: string;
  name: string;
  amount: number;
  currency: string;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const STOPWORDS = new Set(["the", "a", "an", "and", "for", "of", "to", "session", "call", "consultation", "premium", "ai"]);

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * leadScoring emits abstract Stripe-product names that don't share keywords
 * with the seeded consultation titles. This alias map routes each known offer
 * to the consultation title fragment that best fulfils that intent, so the
 * in-chat CTA lands on a concrete bookable session instead of the generic
 * fallback. Matched case-insensitively as a substring of the consultation title.
 */
// NOTE: keys must be in normalized form (see `normalize`) — e.g. "1:1" → "1 1".
const OFFER_CONSULT_ALIASES: Record<string, string[]> = {
  "ai brand audit": ["brand audit", "brand strategy"],
  "premium content strategy": ["content consultation", "content"],
  "premium content strategy pack": ["content consultation", "content"],
  "1 1 creator session": ["founder growth strategy", "brand strategy"],
  "art commission deposit": ["creative direction", "creative"],
  "creative review": ["creative direction", "creative"],
  "creative review session": ["creative direction", "creative"],
};

/** Keyword-overlap score between an offer name and a candidate title (0..1). */
function overlapScore(offerName: string, candidate: string): number {
  const a = new Set(tokens(offerName));
  const b = tokens(candidate);
  if (a.size === 0 || b.length === 0) return 0;
  let hits = 0;
  for (const t of b) if (a.has(t)) hits++;
  return hits / Math.max(a.size, b.length);
}

export function resolveRecommendedAction(
  recommendedOffer: string | null | undefined,
  confidence: number | null | undefined,
  consultations: Consultation[],
  offers: OfferLike[] = []
): RecommendedAction | null {
  if (!recommendedOffer) return null;
  const conf = confidence ?? 0;
  if (conf < 30) return null; // only surface a CTA when reasonably confident

  // 1) Prefer a live Stripe offer match (direct revenue).
  let bestOffer: { offer: OfferLike; score: number } | null = null;
  for (const o of offers) {
    const score = overlapScore(recommendedOffer, o.name);
    if (score >= 0.34 && (!bestOffer || score > bestOffer.score)) {
      bestOffer = { offer: o, score };
    }
  }
  if (bestOffer) {
    const o = bestOffer.offer;
    return {
      type: "offer",
      priceId: o.priceId,
      name: o.name,
      amount: o.amount,
      currency: o.currency,
      ctaText: `Get ${o.name}`,
      confidence: conf,
    };
  }

  // 2) Fall back to a consultation booking (always available, founder-led).
  const active = consultations.filter((c) => c.isActive);

  // 2a) Explicit alias routing for known leadScoring offer names.
  const aliases = OFFER_CONSULT_ALIASES[normalize(recommendedOffer)];
  if (aliases) {
    for (const fragment of aliases) {
      const match = active.find((c) => normalize(c.title).includes(fragment));
      if (match) {
        return {
          type: "booking",
          consultationId: match.id,
          title: match.title,
          price: match.price,
          currency: match.currency,
          ctaText: match.price === 0 ? `Book ${match.title} (Free)` : `Book ${match.title}`,
          confidence: conf,
        };
      }
    }
  }

  // 2b) Generic keyword-overlap match.
  let bestConsult: { c: Consultation; score: number } | null = null;
  for (const c of active) {
    const score = overlapScore(recommendedOffer, c.title);
    if (score >= 0.25 && (!bestConsult || score > bestConsult.score)) {
      bestConsult = { c, score };
    }
  }
  if (bestConsult) {
    const c = bestConsult.c;
    return {
      type: "booking",
      consultationId: c.id,
      title: c.title,
      price: c.price,
      currency: c.currency,
      ctaText: c.price === 0 ? `Book ${c.title} (Free)` : `Book ${c.title}`,
      confidence: conf,
    };
  }

  // 3) Generic: nudge toward the booking section.
  return {
    type: "book_session",
    ctaText: "Book a session with the founder",
    confidence: conf,
  };
}
