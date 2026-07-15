import { Link } from "wouter";
import { ArrowRight, Rocket, Palette, BookOpen, HeartHandshake } from "lucide-react";

type Audience = {
  key: string;
  icon: React.ReactNode;
  accent: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  internal?: boolean;
};

const AUDIENCES: Audience[] = [
  {
    key: "founders",
    icon: <Rocket className="h-6 w-6" aria-hidden="true" />,
    accent: "#F4A62A",
    title: "Founders & Entrepreneurs",
    description:
      "AI-powered strategy, growth systems, and automation that turn bold ideas into real revenue.",
    ctaLabel: "Book a Strategy Session",
    href: "/strategy-session",
    internal: true,
  },
  {
    key: "creators",
    icon: <Palette className="h-6 w-6" aria-hidden="true" />,
    accent: "#a78bfa",
    title: "Creators & Small Businesses",
    description:
      "Branding, digital products, and creative direction that help you stand out and scale with confidence.",
    ctaLabel: "Explore Offers",
    href: "#offers",
  },
  {
    key: "learners",
    icon: <BookOpen className="h-6 w-6" aria-hidden="true" />,
    accent: "#38bdf8",
    title: "Lifelong Learners & Readers",
    description:
      "Practical books, guides, and a knowledge center for growth in health, relationships, and everyday life.",
    ctaLabel: "View Publications",
    href: "#books",
  },
  {
    key: "families",
    icon: <HeartHandshake className="h-6 w-6" aria-hidden="true" />,
    accent: "#22c55e",
    title: "Individuals & Families",
    description:
      "Purpose-built apps that strengthen relationships, support wellness, and inspire daily living.",
    ctaLabel: "Explore Apps",
    href: "#apps",
  },
];

export function WhoWeHelpSection() {
  return (
    <section
      id="who-we-help"
      aria-labelledby="who-we-help-heading"
      className="py-20 border-t border-white/10"
      data-testid="section-who-we-help"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3 reveal">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">
            Who We Help
          </p>
          <h2
            id="who-we-help-heading"
            className="text-3xl md:text-5xl font-heading font-bold tracking-tight"
          >
            Built for the People We Serve
          </h2>
          <p className="text-muted-foreground text-lg">
            One ecosystem — technology, AI, education, and creativity — designed
            around the people it elevates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AUDIENCES.map((a, idx) => {
            const CardLink = a.internal ? Link : "a";
            return (
              <div
                key={a.key}
                className={`lux-card rounded-3xl p-7 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-200 reveal reveal-delay-${(idx % 3) + 1}`}
                style={{ borderTop: `2px solid ${a.accent}30` }}
                data-testid={`card-audience-${a.key}`}
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: `${a.accent}1a`,
                    color: a.accent,
                    border: `1px solid ${a.accent}33`,
                  }}
                >
                  {a.icon}
                </span>
                <h3 className="text-lg font-heading font-bold text-white leading-tight">
                  {a.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed flex-1">
                  {a.description}
                </p>
                <CardLink
                  href={a.href}
                  data-testid={`link-audience-${a.key}`}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: a.accent }}
                >
                  {a.ctaLabel}
                  <ArrowRight
                    className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </CardLink>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
