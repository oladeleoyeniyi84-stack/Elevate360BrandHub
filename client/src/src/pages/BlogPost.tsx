import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import type { BlogPost } from "@shared/schema";
import SEO from "@/components/SEO";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

function formatDate(d: string | Date) {
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
      const items = para.split("\n").filter(l => l.startsWith("- ")).map(l => l.slice(2));
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

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: post, isLoading, isError } = useQuery<BlogPost>({
    queryKey: ["/api/blog", slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const seoTitle = post?.title
    ? `${post.title} | Elevate360Official`
    : "Blog Post | Elevate360Official";
  const seoDescription =
    post?.excerpt || "Read this article from Elevate360Official.";
  const seoPath = post?.slug ? `/blog/${post.slug}` : "/blog";

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO title={seoTitle} description={seoDescription} path={seoPath} type="article" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post?.title || "Elevate360Official Blog Post",
            description: seoDescription,
            author: { "@type": "Organization", name: "Elevate360Official" },
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
          <Link href="/blog" className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition" data-testid="link-back-to-blog">
            <ArrowLeft className="h-4 w-4" />
            Blog
          </Link>
        </div>
      </header>

      <main className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-white/8 rounded-xl w-3/4" />
              <div className="h-4 bg-white/5 rounded-xl w-1/3" />
              <div className="h-64 bg-white/5 rounded-2xl mt-8" />
            </div>
          ) : isError || !post ? (
            <div className="text-center py-24">
              <p className="text-white/40 text-xl font-bold mb-2">Post not found</p>
              <Link href="/blog" className="text-primary text-sm hover:underline">← Back to blog</Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/35">
                    <Calendar className="h-3 w-3" />
                    {formatDate(post.createdAt)}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-heading text-white mb-4 leading-tight">{post.title}</h1>
                <p className="text-white/55 text-lg leading-relaxed border-l-4 pl-4" style={{ borderColor: "#F4A62A" }}>{post.excerpt}</p>
              </div>

              <div className="border-t border-white/8 pt-8">
                {renderBody(post.body)}
              </div>

              <div className="mt-12 pt-8 border-t border-white/8 flex items-center justify-between">
                <Link href="/blog" className="flex items-center gap-2 text-white/40 hover:text-primary text-sm transition">
                  <ArrowLeft className="h-4 w-4" />
                  All posts
                </Link>
                <p className="text-white/25 text-xs">Elevate360Official</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
