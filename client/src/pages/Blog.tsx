import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { BlogPost } from "@shared/schema";
import SEO from "@/components/SEO";
import { ArrowRight, BookOpen, Calendar, Tag } from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  general:       { bg: "rgba(244,166,42,0.12)", color: "#F4A62A" },
  apps:          { bg: "rgba(56,189,248,0.12)",  color: "#38bdf8" },
  books:         { bg: "rgba(251,146,60,0.12)",  color: "#fb923c" },
  music:         { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  art:           { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  entrepreneurship: { bg: "rgba(244,166,42,0.10)", color: "#F4A62A" },
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function Blog() {
  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
    queryFn: async () => {
      const res = await fetch("/api/blog");
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="Blog | Elevate360Official"
        description="Read insights, inspiration, and updates from Elevate360Official on technology, creativity, wellness, relationships, and intentional growth."
        path="/blog"
        type="article"
      />
      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/50 hover:text-white text-sm transition">Home</Link>
            <Link href="/links" className="text-white/50 hover:text-white text-sm transition">Links</Link>
          </div>
        </div>
      </header>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              <BookOpen className="h-3 w-3" />
              Creator Journal
            </span>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
              Insights from{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">Elevate360</span>
            </h1>
            <p className="text-white/55 text-lg max-w-xl mx-auto">
              Thoughts on entrepreneurship, app development, creativity, and building a brand that makes an impact.
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse rounded-2xl border border-white/8 bg-white/3 p-6 h-40" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24">
              <BookOpen className="h-12 w-12 text-white/15 mx-auto mb-4" />
              <p className="text-white/40 text-lg font-medium">No posts yet</p>
              <p className="text-white/25 text-sm mt-2">Check back soon — the creator journal is coming.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {posts.map(post => {
                const cat = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.general;
                return (
                  <Link key={post.id} href={`/blog/${post.slug}`} data-testid={`card-blog-${post.id}`}>
                    <div className="group rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-primary/25 p-6 transition-all duration-300 cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                              {post.category}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-white/35">
                              <Calendar className="h-3 w-3" />
                              {formatDate(post.createdAt)}
                            </span>
                          </div>
                          <h2 className="text-xl font-bold text-white font-heading group-hover:text-primary transition-colors mb-2 line-clamp-2">
                            {post.title}
                          </h2>
                          <p className="text-white/55 text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-white/25 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-white/8 py-8 text-center">
        <p className="text-white/30 text-sm">© {new Date().getFullYear()} Elevate360Official · <Link href="/" className="hover:text-primary transition-colors">Back to site</Link></p>
      </footer>
    </div>
  );
}
