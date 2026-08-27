import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import { ArrowRight, BookOpen, BrainCircuit, Check, Download, Sparkles, Zap } from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const GUIDE_FILE = "/downloads/Elevate360_AI_Business_Growth_Blueprint_2026.pdf";

const INSIDE = [
  "Work smarter with repeatable, AI-assisted workflows",
  "Reach more customers with relevant, human-centered marketing",
  "Turn information into clearer business decisions",
  "Strengthen operations and reduce avoidable errors",
  "Grow responsibly with privacy, verification, and human judgment",
];

const FOR_YOU = [
  "Founders and entrepreneurs building practical AI systems",
  "Creators and professionals who want to save time without losing their voice",
  "Small teams seeking clearer operations, marketing, and decisions",
];

export default function Guide() {
  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="Free AI Business Growth Blueprint 2026 | Elevate360Official"
        description="Download Elevate360Official's free seven-page AI Business Growth Blueprint 2026 with 15 practical ways to save time, attract customers, and grow responsibly."
        path="/ai-growth-guide"
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DigitalDocument",
            name: "AI Business Growth Blueprint 2026",
            description: "A free seven-page guide with 15 practical ways to save time, attract customers, and grow responsibly with AI.",
            author: { "@type": "Organization", name: "Elevate360Official" },
            encodingFormat: "application/pdf",
            isAccessibleForFree: true,
            url: `https://www.elevate360official.com${GUIDE_FILE}`,
          })}
        </script>
      </Helmet>

      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360Official" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/50 hover:text-white text-sm transition" data-testid="link-guide-home">Home</Link>
            <Link href="/knowledge" className="text-white/50 hover:text-white text-sm transition" data-testid="link-guide-knowledge">Knowledge</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-14 md:py-24">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-5"
                style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
                <BookOpen className="h-3 w-3" />
                Free Download
              </span>
              <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-5 leading-tight">
                AI Business Growth{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">Blueprint 2026</span>
              </h1>
              <p className="text-white/65 text-lg mb-8 leading-relaxed max-w-2xl">
                Get 15 practical ways to save time, attract customers, improve decisions, strengthen operations, and grow responsibly with AI.
              </p>
              <ul className="space-y-3 mb-8">
                {INSIDE.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(244,166,42,0.15)" }}>
                      <Check className="h-3 w-3" style={{ color: "#F4A62A" }} />
                    </span>
                    <span className="text-white/70">{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href={GUIDE_FILE}
                download="Elevate360_AI_Business_Growth_Blueprint_2026.pdf"
                data-testid="button-guide-download"
                className="btn-primary w-full sm:w-auto px-7 py-4 rounded-full text-base font-semibold inline-flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Download the Free PDF
              </a>
              <p className="text-white/45 text-sm mt-4">
                Free PDF · 7 pages · No payment or email required
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 p-3 md:p-4 shadow-2xl" style={{ background: "rgba(244,166,42,0.06)" }}>
              <img
                src="/downloads/ai-growth-blueprint-cover.jpg"
                alt="Cover of the Elevate360Official AI Business Growth Blueprint 2026"
                width={1080}
                height={1080}
                className="w-full h-auto rounded-2xl"
              />
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-white/8">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-8 text-center">Who it is for</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[Zap, BrainCircuit, Sparkles].map((Icon, index) => (
                <div key={FOR_YOU[index]} className="rounded-2xl border border-white/8 bg-white/3 p-6 text-center">
                  <Icon className="h-7 w-7 mx-auto mb-3" style={{ color: "#F4A62A" }} />
                  <p className="text-white/70 text-sm leading-relaxed">{FOR_YOU[index]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-white/8">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#F4A62A" }}>Optional next step</p>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-4">Want a plan tailored to your organization?</h2>
            <p className="text-white/60 mb-7 leading-relaxed">
              The guide is completely free. If you later want personalized support, the AI Growth Strategy Session is a separate paid service.
            </p>
            <Link href="/strategy-session" data-testid="button-guide-strategy-cta"
              className="px-6 py-3 rounded-full text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 transition inline-flex items-center gap-2">
              Explore the Optional Strategy Session <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 py-8 text-center">
        <p className="text-white/30 text-sm">© {new Date().getFullYear()} Elevate360Official · <Link href="/" className="hover:text-primary transition-colors">Back to site</Link></p>
      </footer>
    </div>
  );
}
