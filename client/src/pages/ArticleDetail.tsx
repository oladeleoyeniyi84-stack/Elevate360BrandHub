import type { ReactNode } from "react";
import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import { ARTICLES, getArticle, getRelatedArticles } from "@/data/articles";
import { ArrowLeft, ArrowRight, Clock, Download, Rocket, Sparkles, Tag, Target } from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderBody(body: string) {
  return body.split("\n\n").map((para, i) => {
    if (para.startsWith("### ")) return <h3 key={i} className="text-lg font-bold font-heading text-white mt-8 mb-3">{renderInline(para.slice(4))}</h3>;
    if (para.startsWith("## ")) return <h2 key={i} className="text-2xl font-bold font-heading text-white mt-10 mb-4">{renderInline(para.slice(3))}</h2>;
    if (para.startsWith("# ")) return <h1 key={i} className="text-3xl font-bold font-heading text-white mt-10 mb-4">{renderInline(para.slice(2))}</h1>;
    if (para.startsWith("- ") || para.includes("\n- ")) {
      const items = para.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
      return <ul key={i} className="list-disc list-inside space-y-2 text-white/70 text-base leading-relaxed my-4">{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>;
    }
    if (para.startsWith("> ")) return (
      <blockquote key={i} className="border-l-4 pl-4 my-6 italic text-white/60 text-base" style={{ borderColor: "#F4A62A" }}>
        {renderInline(para.slice(2))}
      </blockquote>
    );
    return <p key={i} className="text-white/70 text-base leading-relaxed my-4">{renderInline(para)}</p>;
  });
}

export default function ArticleDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const article = getArticle(slug);
  const related = getRelatedArticles(slug);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(220 50% 8%)" }}>
        <SEO
          title="Article Not Found | Elevate360Official"
          description="The article you are looking for could not be found."
          path="/knowledge"
        />
        <div className="text-center py-24 px-4">
          <p className="text-white/40 text-xl font-bold mb-2" data-testid="text-article-not-found">Article not found</p>
          <Link href="/knowledge" className="text-primary text-sm hover:underline" data-testid="link-back-knowledge">← Back to Knowledge Center</Link>
        </div>
      </div>
    );
  }

  const seoTitle = `${article.title} | Elevate360Official`;
  const seoPath = `/knowledge/${article.slug}`;

  const bodyBlocks = renderBody(article.body);
  const midIndex = Math.max(1, Math.floor(bodyBlocks.length / 2));
  const midCta = (
    <Link
      key="cta-article-mid"
      href="/pricing"
      data-testid="cta-article-mid"
      className="group not-prose flex items-center justify-between gap-3 rounded-2xl border p-5 my-8 transition-all hover:scale-[1.01]"
      style={{ background: "rgba(244,166,42,0.08)", borderColor: "rgba(244,166,42,0.3)" }}
    >
      <span className="flex items-center gap-3">
        <Target className="h-6 w-6 flex-shrink-0" style={{ color: "#F4A62A" }} />
        <span className="text-white/85 text-sm font-semibold">
          Ready to go further? Unlock premium tools and AI credits with an Elevate360 plan.
        </span>
      </span>
      <ArrowRight className="h-5 w-5 flex-shrink-0 text-white/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
  const bodyWithMidCta =
    bodyBlocks.length > 1
      ? [...bodyBlocks.slice(0, midIndex), midCta, ...bodyBlocks.slice(midIndex)]
      : [...bodyBlocks, midCta];

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title={seoTitle}
        description={article.excerpt}
        path={seoPath}
        type="article"
        keywords={article.keywords.join(", ")}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.excerpt,
            datePublished: article.date,
            articleSection: article.category,
            keywords: article.keywords.join(", "),
            author: { "@type": "Person", name: "Oladele Oyeniyi", jobTitle: "Founder of Elevate360" },
            publisher: {
              "@type": "Organization",
              name: "Elevate360Official",
              logo: { "@type": "ImageObject", url: "https://www.elevate360official.com/social-preview/elevate360-logo-share.png" },
            },
            mainEntityOfPage: `https://www.elevate360official.com${seoPath}`,
          })}
        </script>
      </Helmet>

      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360" className="h-8 w-auto" />
          </Link>
          <Link href="/knowledge" className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition" data-testid="link-back-to-knowledge">
            <ArrowLeft className="h-4 w-4" />
            Knowledge Center
          </Link>
        </div>
      </header>

      <main className="py-12 md:py-20">
        <article className="container mx-auto px-4 md:px-6 max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
                <Tag className="h-3 w-3" />
                {article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/35">
                <Clock className="h-3 w-3" />
                {article.readTime} min read
              </span>
              <span className="text-xs text-white/35">{formatDate(article.date)}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-heading text-white mb-4 leading-tight" data-testid="text-article-title">{article.title}</h1>
            <p className="text-white/55 text-lg leading-relaxed border-l-4 pl-4" style={{ borderColor: "#F4A62A" }}>{article.excerpt}</p>
          </div>

          {/* Top CTA */}
          <Link href="/strategy-session" data-testid="cta-article-top"
            className="group flex items-center justify-between gap-3 rounded-2xl border p-5 mb-2 transition-all hover:scale-[1.01]"
            style={{ background: "rgba(244,166,42,0.08)", borderColor: "rgba(244,166,42,0.3)" }}>
            <span className="flex items-center gap-3">
              <Rocket className="h-6 w-6 flex-shrink-0" style={{ color: "#F4A62A" }} />
              <span className="text-white/85 text-sm font-semibold">
                Want a custom plan? Book the AI Growth Strategy Session — launch offer $97.
              </span>
            </span>
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-white/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>

          <div className="border-t border-white/8 pt-8" data-testid="article-body">
            {bodyWithMidCta}
          </div>

          {/* Lead magnet */}
          <div className="mt-12 rounded-2xl border border-white/10 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ background: "rgba(244,166,42,0.06)" }}>
            <Download className="h-8 w-8 flex-shrink-0" style={{ color: "#F4A62A" }} />
            <div className="flex-1">
              <h3 className="text-white font-heading font-bold text-lg">Get the Elevate360 Builder's Toolkit</h3>
              <p className="text-white/55 text-sm mt-1">Create a free account to unlock templates, checklists, and the AI Concierge built around these ideas.</p>
            </div>
            <Link href="/account" data-testid="button-lead-magnet"
              className="btn-primary px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap">
              Get the toolkit
            </Link>
          </div>

          {/* Author box */}
          <div className="mt-12 pt-8 border-t border-white/8">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold font-heading"
                style={{ background: "rgba(244,166,42,0.15)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.3)" }}>
                OO
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-white/35 mb-1">Written by</p>
                <p className="text-white font-bold font-heading text-lg" data-testid="text-author-name">Oladele Oyeniyi</p>
                <p className="text-white/50 text-sm">Founder of Elevate360 — building apps, books, and tools that elevate the world, one product at a time.</p>
              </div>
            </div>
          </div>

          {/* Conversion CTA */}
          <div className="mt-12 rounded-2xl border border-white/10 p-8 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: "#F4A62A" }} />
            <h3 className="text-2xl font-heading font-bold text-white mb-2">Ready to put this into practice?</h3>
            <p className="text-white/55 max-w-lg mx-auto mb-6">
              Start free, then upgrade when you are ready for premium AI credits and tools.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/pricing" data-testid="button-article-pricing"
                className="btn-primary px-6 py-2.5 rounded-full text-sm font-semibold">
                View pricing
              </Link>
              <Link href="/account" data-testid="button-article-account"
                className="px-6 py-2.5 rounded-full text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 transition">
                Go to your account
              </Link>
            </div>
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <div className="mt-16">
              <h3 className="text-xl font-heading font-bold text-white mb-6">Keep reading</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <Link key={r.slug} href={`/knowledge/${r.slug}`} data-testid={`link-related-${r.slug}`}>
                    <div className="group rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-primary/25 p-5 transition-all h-full flex flex-col">
                      <span className="text-xs font-semibold mb-2" style={{ color: "#F4A62A" }}>{r.category}</span>
                      <h4 className="text-white font-bold font-heading leading-snug group-hover:text-primary transition-colors flex-1">{r.title}</h4>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs text-white/40 group-hover:text-primary transition-colors">
                        Read article <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-white/8 flex items-center justify-between">
            <Link href="/knowledge" className="flex items-center gap-2 text-white/40 hover:text-primary text-sm transition" data-testid="link-all-articles">
              <ArrowLeft className="h-4 w-4" />
              All articles
            </Link>
            <p className="text-white/25 text-xs">{ARTICLES.length} guides · Elevate360Official</p>
          </div>
        </article>
      </main>
    </div>
  );
}
