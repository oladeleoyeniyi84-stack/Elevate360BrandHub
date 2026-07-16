import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Newspaper, Star, Tag } from "lucide-react";
import type { HomepageFeed } from "@shared/types/homepageFeed";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

export function LatestFromElevate360() {
  const { data: feed } = useQuery<HomepageFeed | null>({
    queryKey: ["/api/homepage/feed"],
    queryFn: async () => {
      const res = await fetch("/api/homepage/feed");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const posts = feed?.posts ?? [];
  const topOffer = feed?.offers?.[0];
  const topReview = feed?.testimonials?.[0];

  // Fallback: if nothing is available (error, empty DB, all sources down),
  // render nothing — the homepage never shows a broken or empty section.
  if (posts.length === 0 && !topOffer && !topReview) return null;

  return (
    <section
      id="latest"
      aria-labelledby="latest-heading"
      className="py-20 border-t border-white/8"
      style={{ background: "hsl(220 50% 8%)" }}
      data-testid="section-latest"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">
            Latest From Elevate360
          </p>
          <h2
            id="latest-heading"
            className="text-3xl md:text-5xl font-heading font-bold tracking-tight"
          >
            Fresh Insights, Offers & Community Wins
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {posts.length > 0 && (
            <div className={topOffer || topReview ? "lg:col-span-2" : "lg:col-span-3"}>
              <div className="flex items-center gap-2 mb-5 text-white/50">
                <Newspaper className="h-4 w-4" aria-hidden="true" />
                <h3 className="text-sm font-semibold tracking-wide uppercase">Latest Articles</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {posts.map((post, idx) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className={`lux-card rounded-2xl p-6 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-200 group`}
                    data-testid={`card-latest-post-${post.id}`}
                  >
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span
                        className="rounded-full px-2.5 py-0.5 font-medium capitalize"
                        style={{
                          background: "rgba(244,166,42,0.12)",
                          color: "#F4A62A",
                          border: "1px solid rgba(244,166,42,0.25)",
                        }}
                      >
                        {post.category}
                      </span>
                      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                    </div>
                    <h4 className="text-base font-heading font-bold text-white leading-snug group-hover:text-primary transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-sm text-white/60 leading-relaxed line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Read article
                      <ArrowRight
                        className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-primary transition-colors"
                  data-testid="link-latest-all-posts"
                >
                  View all articles
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}

          {(topOffer || topReview) && (
            <div className="flex flex-col gap-6">
              {topOffer && (
                <div
                  className="lux-card rounded-2xl p-6 flex flex-col gap-3"
                  style={{ borderTop: "2px solid rgba(244,166,42,0.35)" }}
                  data-testid="card-latest-offer"
                >
                  <div className="flex items-center gap-2 text-white/50">
                    <Tag className="h-4 w-4" aria-hidden="true" />
                    <h3 className="text-sm font-semibold tracking-wide uppercase">Featured Offer</h3>
                  </div>
                  <h4 className="text-lg font-heading font-bold text-white leading-tight">
                    {topOffer.name}
                  </h4>
                  {topOffer.description && (
                    <p className="text-sm text-white/60 leading-relaxed line-clamp-3">
                      {topOffer.description}
                    </p>
                  )}
                  <p className="text-2xl font-heading font-extrabold text-primary" data-testid="text-latest-offer-price">
                    {formatPrice(topOffer.amount, topOffer.currency)}
                  </p>
                  <a
                    href="#offers"
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-colors"
                    data-testid="link-latest-offer"
                  >
                    View offer details
                    <ArrowRight
                      className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              )}

              {topReview && (
                <div
                  className="lux-card rounded-2xl p-6 flex flex-col gap-3"
                  data-testid="card-latest-review"
                >
                  <div className="flex items-center gap-2 text-white/50">
                    <Star className="h-4 w-4" aria-hidden="true" />
                    <h3 className="text-sm font-semibold tracking-wide uppercase">Recent Review</h3>
                  </div>
                  <div
                    className="flex items-center gap-0.5"
                    role="img"
                    aria-label={`Rated ${topReview.rating} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4"
                        aria-hidden="true"
                        style={{
                          color: i < topReview.rating ? "#F4A62A" : "rgba(255,255,255,0.15)",
                          fill: i < topReview.rating ? "#F4A62A" : "none",
                        }}
                      />
                    ))}
                  </div>
                  <blockquote className="text-sm text-white/70 leading-relaxed line-clamp-4">
                    "{topReview.body}"
                  </blockquote>
                  <p className="text-sm text-white/50">
                    <span className="font-semibold text-white/80">{topReview.name}</span>
                    {" · "}
                    {topReview.product}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
