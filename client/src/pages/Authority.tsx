import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Newspaper, Milestone, BadgeCheck, ExternalLink, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const SITE_URL = "https://www.elevate360official.com";

type AuthorityItem = {
  id: number;
  type: "media_feature" | "milestone" | "credential" | "award" | "press";
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl: string;
  dateLabel: string;
  featured: boolean;
  sortOrder: number;
};

const TYPE_META: Record<AuthorityItem["type"], { label: string; icon: any }> = {
  media_feature: { label: "Media Feature", icon: Newspaper },
  press: { label: "Press", icon: Newspaper },
  milestone: { label: "Milestone", icon: Milestone },
  credential: { label: "Credential", icon: BadgeCheck },
  award: { label: "Award", icon: Award },
};

const GROUP_ORDER: AuthorityItem["type"][] = ["media_feature", "press", "award", "credential", "milestone"];

export default function Authority() {
  const { data: items = [], isLoading } = useQuery<AuthorityItem[]>({
    queryKey: ["/api/authority"],
    queryFn: async () => {
      const r = await fetch("/api/authority");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const groups = GROUP_ORDER
    .map((type) => ({ type, items: items.filter((i) => i.type === type) }))
    .filter((g) => g.items.length > 0);

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Oladele Oyeniyi",
    jobTitle: "Founder, Entrepreneur, Author, App Developer, Visual Artist, Music Producer",
    worksFor: { "@type": "Organization", name: "Elevate360Official" },
    url: `${SITE_URL}/founder`,
    award: items.filter((i) => i.type === "award").map((i) => i.title),
    hasCredential: items
      .filter((i) => i.type === "credential")
      .map((i) => ({
        "@type": "EducationalOccupationalCredential",
        name: i.title,
        ...(i.source ? { recognizedBy: { "@type": "Organization", name: i.source } } : {}),
      })),
    subjectOf: items
      .filter((i) => i.type === "media_feature" || i.type === "press")
      .map((i) => ({
        "@type": "Article",
        headline: i.title,
        ...(i.url ? { url: i.url } : {}),
        ...(i.source ? { publisher: { "@type": "Organization", name: i.source } } : {}),
      })),
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="Founder Authority | Oladele Oyeniyi — Elevate360Official"
        description="Media features, milestones, credentials, and awards establishing the authority of Oladele Oyeniyi, founder of Elevate360Official."
        path="/founder"
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(personLd)}</script>
      </Helmet>

      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360" className="h-8 w-auto" />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition" data-testid="link-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#F4A62A]/30 text-[#F4A62A] text-xs font-semibold mb-5">
            <Sparkles className="h-3.5 w-3.5" />
            Founder Authority
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight" data-testid="text-authority-heading">
            Oladele Oyeniyi
          </h1>
          <p className="text-[#F4A62A] font-semibold mt-2">Founder · Elevate360Official</p>
          <p className="text-white/55 max-w-2xl mx-auto mt-4 leading-relaxed">
            Recognition, milestones, and credentials behind the Elevate360 ecosystem of apps, books, art, and music.
          </p>
        </div>

        {isLoading ? (
          <p className="text-center text-white/40" data-testid="text-authority-loading">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-center text-white/40" data-testid="text-authority-empty">Authority highlights coming soon.</p>
        ) : (
          <div className="space-y-14">
            {groups.map((group) => {
              const Meta = TYPE_META[group.type];
              const Icon = Meta.icon;
              return (
                <section key={group.type} data-testid={`section-authority-${group.type}`}>
                  <div className="flex items-center gap-2 mb-6">
                    <Icon className="h-5 w-5 text-[#F4A62A]" />
                    <h2 className="text-xl font-bold text-white">{Meta.label}s</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {group.items.map((item) => (
                      <article
                        key={item.id}
                        data-testid={`card-authority-${item.id}`}
                        className="lux-card flex flex-col"
                      >
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-36 object-cover rounded-lg mb-4" />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-white leading-snug" data-testid={`text-authority-title-${item.id}`}>{item.title}</h3>
                          {item.featured && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#F4A62A] border border-[#F4A62A]/40 rounded px-1.5 py-0.5">Featured</span>
                          )}
                        </div>
                        {(item.source || item.dateLabel) && (
                          <p className="text-xs text-white/40 mt-1">
                            {[item.source, item.dateLabel].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-sm text-white/60 mt-3 leading-relaxed flex-1">{item.description}</p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-authority-${item.id}`}
                            className="inline-flex items-center gap-1.5 text-sm text-[#F4A62A] hover:text-amber-300 font-semibold mt-4"
                          >
                            View source <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
