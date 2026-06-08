import { useState } from "react";
import { Link } from "wouter";
import SEO from "@/components/SEO";
import { ARTICLES } from "@/data/articles";
import { ArrowRight, BookOpen, Clock, Sparkles } from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "Brand Building": { bg: "rgba(244,166,42,0.12)", color: "#F4A62A" },
  "AI & Technology": { bg: "rgba(56,189,248,0.12)", color: "#38bdf8" },
  Entrepreneurship: { bg: "rgba(251,146,60,0.12)", color: "#fb923c" },
  Publishing: { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  Creativity: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
  Wellness: { bg: "rgba(45,212,191,0.12)", color: "#2dd4bf" },
  Relationships: { bg: "rgba(244,114,182,0.12)", color: "#f472b6" },
  Productivity: { bg: "rgba(250,204,21,0.12)", color: "#facc15" },
};

function catStyle(category: string) {
  return CATEGORY_COLORS[category] ?? { bg: "rgba(244,166,42,0.12)", color: "#F4A62A" };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function KnowledgeCenter() {
  const categories = ["All", ...Array.from(new Set(ARTICLES.map((a) => a.category)))];
  const [active, setActive] = useState("All");

  const visible = active === "All" ? ARTICLES : ARTICLES.filter((a) => a.category === active);

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="Knowledge Center | Elevate360Official"
        description="Practical guides on brand building, AI, digital products, creativity, wellness, and growth from Oladele Oyeniyi, founder of Elevate360."
        path="/knowledge"
        type="article"
      />

      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/50 hover:text-white text-sm transition" data-testid="link-knowledge-home">Home</Link>
            <Link href="/blog" className="text-white/50 hover:text-white text-sm transition" data-testid="link-knowledge-blog">Blog</Link>
            <Link href="/pricing" className="text-white/50 hover:text-white text-sm transition" data-testid="link-knowledge-pricing">Pricing</Link>
          </div>
        </div>
      </header>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              <Sparkles className="h-3 w-3" />
              Knowledge Center
            </span>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
              Guides to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">Build & Grow</span>
            </h1>
            <p className="text-white/55 text-lg max-w-2xl mx-auto">
              Practical, no-fluff thinking on brands, AI, digital products, creativity, and the discipline of shipping —
              written by the team behind Elevate360.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                data-testid={`filter-category-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  active === c
                    ? "bg-primary text-black border-primary"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {visible.map((article) => {
              const cat = catStyle(article.category);
              return (
                <Link key={article.slug} href={`/knowledge/${article.slug}`} data-testid={`card-article-${article.slug}`}>
                  <div className="group h-full rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-primary/25 p-6 transition-all duration-300 cursor-pointer flex flex-col">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                        {article.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/35">
                        <Clock className="h-3 w-3" />
                        {article.readTime} min read
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white font-heading group-hover:text-primary transition-colors mb-2 leading-snug">
                      {article.title}
                    </h2>
                    <p className="text-white/55 text-sm leading-relaxed flex-1">{article.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-white/30">{formatDate(article.date)}</span>
                      <ArrowRight className="h-5 w-5 text-white/25 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-16 rounded-2xl border border-white/10 p-8 text-center" style={{ background: "rgba(244,166,42,0.06)" }}>
            <BookOpen className="h-8 w-8 mx-auto mb-3" style={{ color: "#F4A62A" }} />
            <h3 className="text-2xl font-heading font-bold text-white mb-2">Go deeper than the articles</h3>
            <p className="text-white/55 max-w-xl mx-auto mb-6">
              Create a free account to save your progress, unlock the AI Concierge, and get tools that put these ideas to work.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/account" data-testid="button-knowledge-create-account"
                className="btn-primary px-6 py-2.5 rounded-full text-sm font-semibold">
                Create free account
              </Link>
              <Link href="/pricing" data-testid="button-knowledge-pricing"
                className="px-6 py-2.5 rounded-full text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 transition">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8 text-center">
        <p className="text-white/30 text-sm">© {new Date().getFullYear()} Elevate360Official · <Link href="/" className="hover:text-primary transition-colors">Back to site</Link></p>
      </footer>
    </div>
  );
}
