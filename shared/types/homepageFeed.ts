// Sprint 70.2 — Public homepage feed contract shared by server + client.
// Every field here is already publicly exposed elsewhere (/api/blog, /api/offers,
// /api/testimonials); this feed is a bounded, cached aggregation — never a wider surface.

export type HomepageFeedPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  createdAt: string;
};

export type HomepageFeedOffer = {
  priceId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
};

export type HomepageFeedTestimonial = {
  id: number;
  name: string;
  handle: string | null;
  rating: number;
  body: string;
  product: string;
  createdAt: string;
};

export type HomepageFeedSourceStatus = "ok" | "error";

export type HomepageFeedSources = {
  posts: HomepageFeedSourceStatus;
  offers: HomepageFeedSourceStatus;
  testimonials: HomepageFeedSourceStatus;
};

export type HomepageFeed = {
  posts: HomepageFeedPost[];
  offers: HomepageFeedOffer[];
  testimonials: HomepageFeedTestimonial[];
  generatedAt: string;
  meta: {
    cached: boolean;
    ageSeconds: number;
    stale: boolean;
    sources: HomepageFeedSources;
  };
};
