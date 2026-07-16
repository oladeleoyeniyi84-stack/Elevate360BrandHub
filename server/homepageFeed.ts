// Sprint 70.2 — Public homepage feed assembler.
// Bounded reads (LIMIT'd projections, no blog bodies), single-entry in-memory cache
// (bounded by design: one small snapshot object, 5-min TTL), inflight dedupe so a
// cache miss under concurrent load runs the queries once, and stale-serve fallback
// when every source fails. Sources are isolated via Promise.allSettled — one failing
// source never takes down the feed.

import { storage } from "./storage";
import type {
  HomepageFeed,
  HomepageFeedOffer,
  HomepageFeedPost,
  HomepageFeedSources,
  HomepageFeedTestimonial,
} from "@shared/types/homepageFeed";

const FEED_TTL_MS = 5 * 60 * 1000;
const POSTS_LIMIT = 3;
const OFFERS_LIMIT = 3;
const TESTIMONIALS_LIMIT = 3;

export type OfferSource = () => Promise<
  Array<{ priceId: string; name: string; description: string; amount: number; currency: string }>
>;

type Snapshot = {
  posts: HomepageFeedPost[];
  offers: HomepageFeedOffer[];
  testimonials: HomepageFeedTestimonial[];
  generatedAt: string;
  sources: HomepageFeedSources;
};

let cached: { snapshot: Snapshot; fetchedAt: number } | null = null;
let inflight: Promise<Snapshot> | null = null;

function emptySnapshot(sources: HomepageFeedSources): Snapshot {
  return { posts: [], offers: [], testimonials: [], generatedAt: new Date().toISOString(), sources };
}

function withMeta(snapshot: Snapshot, cachedHit: boolean, ageMs: number, stale: boolean): HomepageFeed {
  return {
    posts: snapshot.posts,
    offers: snapshot.offers,
    testimonials: snapshot.testimonials,
    generatedAt: snapshot.generatedAt,
    meta: {
      cached: cachedHit,
      ageSeconds: Math.round(ageMs / 1000),
      stale,
      sources: snapshot.sources,
    },
  };
}

async function buildSnapshot(listOffers: OfferSource): Promise<Snapshot> {
  const [postsResult, offersResult, testimonialsResult] = await Promise.allSettled([
    storage.getLatestPublishedBlogPosts(POSTS_LIMIT),
    listOffers(),
    storage.getLatestApprovedTestimonials(TESTIMONIALS_LIMIT),
  ]);

  const sources: HomepageFeedSources = {
    posts: postsResult.status === "fulfilled" ? "ok" : "error",
    offers: offersResult.status === "fulfilled" ? "ok" : "error",
    testimonials: testimonialsResult.status === "fulfilled" ? "ok" : "error",
  };

  for (const [name, result] of [
    ["posts", postsResult],
    ["offers", offersResult],
    ["testimonials", testimonialsResult],
  ] as const) {
    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message.split("\n")[0] : "unknown";
      console.warn(`[homepageFeed] source=${name} failed (${reason}) — serving empty section`);
    }
  }

  const posts: HomepageFeedPost[] =
    postsResult.status === "fulfilled"
      ? postsResult.value.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          category: p.category,
          createdAt: p.createdAt.toISOString(),
        }))
      : [];

  // Public projection only — drop productId/metadata even though /api/offers exposes them;
  // the feed carries the minimum the homepage needs.
  const offers: HomepageFeedOffer[] =
    offersResult.status === "fulfilled"
      ? offersResult.value.slice(0, OFFERS_LIMIT).map((o) => ({
          priceId: o.priceId,
          name: o.name,
          description: o.description ?? "",
          amount: o.amount,
          currency: o.currency,
        }))
      : [];

  // Approved-only rows come from storage; strip the `approved` flag from the wire shape.
  const testimonials: HomepageFeedTestimonial[] =
    testimonialsResult.status === "fulfilled"
      ? testimonialsResult.value.map((t) => ({
          id: t.id,
          name: t.name,
          handle: t.handle,
          rating: t.rating,
          body: t.body,
          product: t.product,
          createdAt: t.createdAt.toISOString(),
        }))
      : [];

  return { posts, offers, testimonials, generatedAt: new Date().toISOString(), sources };
}

export async function getHomepageFeed(listOffers: OfferSource): Promise<HomepageFeed> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < FEED_TTL_MS) {
    return withMeta(cached.snapshot, true, now - cached.fetchedAt, false);
  }

  if (!inflight) {
    inflight = buildSnapshot(listOffers).finally(() => {
      inflight = null;
    });
  }

  try {
    const snapshot = await inflight;
    const allFailed =
      snapshot.sources.posts === "error" &&
      snapshot.sources.offers === "error" &&
      snapshot.sources.testimonials === "error";

    if (allFailed && cached) {
      // Total refresh failure — keep serving the last good snapshot (marked stale).
      return withMeta(cached.snapshot, true, Date.now() - cached.fetchedAt, true);
    }

    cached = { snapshot, fetchedAt: Date.now() };
    return withMeta(snapshot, false, 0, false);
  } catch (err) {
    // allSettled makes this path near-impossible, but never let the feed throw.
    const reason = err instanceof Error ? err.message.split("\n")[0] : "unknown";
    console.warn(`[homepageFeed] unexpected build failure (${reason})`);
    if (cached) return withMeta(cached.snapshot, true, Date.now() - cached.fetchedAt, true);
    return withMeta(emptySnapshot({ posts: "error", offers: "error", testimonials: "error" }), false, 0, false);
  }
}

export function getHomepageFeedCacheStats() {
  return {
    hasSnapshot: cached !== null,
    ageMs: cached ? Date.now() - cached.fetchedAt : null,
    ttlMs: FEED_TTL_MS,
    entries: cached ? 1 : 0, // single-entry cache — bounded by design
  };
}
