import { Link } from "wouter";
import {
  ArrowRight,
  Rocket,
  Building2,
  Church,
  HeartHandshake,
  Stethoscope,
  GraduationCap,
  Sparkles,
} from "lucide-react";

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
    key: "entrepreneurs",
    icon: <Rocket className="h-6 w-6" aria-hidden="true" />,
    accent: "#F4A62A",
    title: "Entrepreneurs",
    description:
      "AI-powered strategy, automation, and growth systems that turn bold ideas into sustainable revenue.",
    ctaLabel: "Book a Strategy Session",
    href: "/strategy-session",
    internal: true,
  },
  {
    key: "smb",
    icon: <Building2 className="h-6 w-6" aria-hidden="true" />,
    accent: "#38bdf8",
    title: "Small & Medium-Sized Businesses",
    description:
      "Practical digital tools and expert guidance to modernize operations, reach more customers, and grow with confidence.",
    ctaLabel: "Book a Consultation",
    href: "#book-session",
  },
  {
    key: "churches",
    icon: <Church className="h-6 w-6" aria-hidden="true" />,
    accent: "#a78bfa",
    title: "Churches & Faith Organizations",
    description:
      "Technology and media solutions that help you engage your congregation and extend your ministry's reach.",
    ctaLabel: "Book a Session",
    href: "#book-session",
  },
  {
    key: "nonprofits",
    icon: <HeartHandshake className="h-6 w-6" aria-hidden="true" />,
    accent: "#22c55e",
    title: "Nonprofits & Community Organizations",
    description:
      "Digital innovation that amplifies your mission, grows your community, and multiplies your impact.",
    ctaLabel: "Book a Session",
    href: "#book-session",
  },
  {
    key: "healthcare",
    icon: <Stethoscope className="h-6 w-6" aria-hidden="true" />,
    accent: "#2dd4bf",
    title: "Healthcare & Wellness Providers",
    description:
      "Wellness-focused apps and education that support healthier habits for the people you serve.",
    ctaLabel: "Explore HealthWise",
    href: "/apps/healthwise",
    internal: true,
  },
  {
    key: "educators",
    icon: <GraduationCap className="h-6 w-6" aria-hidden="true" />,
    accent: "#fb923c",
    title: "Educators & Institutions",
    description:
      "Educational content, publications, and AI tools that make learning practical, engaging, and accessible.",
    ctaLabel: "Visit the Knowledge Center",
    href: "/knowledge",
    internal: true,
  },
  {
    key: "creators",
    icon: <Sparkles className="h-6 w-6" aria-hidden="true" />,
    accent: "#f472b6",
    title: "Creators & Personal Brands",
    description:
      "Creative apps, branding, and content systems that help you build your audience and monetize your craft.",
    ctaLabel: "Explore Video Crafter",
    href: "/apps/video-crafter",
    internal: true,
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
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3 reveal">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">
            Who We Help
          </p>
          <h2
            id="who-we-help-heading"
            className="text-3xl md:text-5xl font-heading font-bold tracking-tight"
          >
            Solutions Designed for People and Organizations Ready to Grow
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-5">
          {AUDIENCES.map((a, idx) => {
            const CardLink = a.internal ? Link : "a";
            return (
              <div
                key={a.key}
                className={`lux-card rounded-3xl p-7 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-200 reveal reveal-delay-${(idx % 3) + 1} w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.875rem)] max-w-md`}
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
