import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import { ArrowRight, Check, Loader2, Rocket, Target, Sparkles, Zap, BrainCircuit } from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const INCLUDES = [
  "A 60-minute deep-dive into your brand, product, and growth goals",
  "A custom AI growth roadmap tailored to your business",
  "Concrete automation opportunities you can ship immediately",
  "A prioritized 30-day action plan",
  "Follow-up notes and recommended tools",
];

const FOR_YOU = [
  "Solo founders and creators ready to scale with AI",
  "Small teams drowning in manual, repeatable work",
  "Builders who want a clear plan, not more theory",
];

const FAQ = [
  { q: "What happens after I sign up?", a: "You'll get access to schedule your session and a short intake so we can make the most of our time together." },
  { q: "Is this a sales call?", a: "No. It's a working session focused entirely on your growth roadmap — you leave with a plan you can act on." },
  { q: "What if I'm just getting started?", a: "Perfect timing. We'll focus on the highest-leverage first moves so you build on the right foundation." },
];

export default function StrategySession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/strategy-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setError(data?.message || "Checkout is unavailable right now. Please try again later.");
        setLoading(false);
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="AI Growth Strategy Session — Launch Offer $97 | Elevate360Official"
        description="Book a 1:1 AI Growth Strategy Session with the founder of Elevate360. Get a custom AI growth roadmap and a 30-day action plan. Launch offer — $97."
        path="/strategy-session"
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "AI Growth Strategy Session",
            description: "A 1:1 AI growth strategy session delivering a custom roadmap and 30-day action plan.",
            provider: { "@type": "Organization", name: "Elevate360Official" },
            offers: { "@type": "Offer", price: "97", priceCurrency: "USD" },
          })}
        </script>
      </Helmet>

      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/50 hover:text-white text-sm transition" data-testid="link-strategy-home">Home</Link>
            <Link href="/about-founder" className="text-white/50 hover:text-white text-sm transition" data-testid="link-strategy-founder">Founder</Link>
            <Link href="/knowledge" className="text-white/50 hover:text-white text-sm transition" data-testid="link-strategy-knowledge">Knowledge</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-5"
            style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
            <Rocket className="h-3 w-3" />
            Launch Offer
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-5 leading-tight">
            AI Growth{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">Strategy Session</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            A focused 1:1 working session to map exactly how AI and automation can grow your brand —
            and the 30-day plan to make it happen.
          </p>
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-white/40 text-xl line-through">$297</span>
            <span className="text-4xl font-heading font-bold" style={{ color: "#F4A62A" }} data-testid="text-strategy-price">$97</span>
            <span className="text-white/40 text-sm">launch price</span>
          </div>
          <button onClick={startCheckout} disabled={loading} data-testid="button-strategy-cta-hero"
            className="btn-primary px-8 py-3 rounded-full text-base font-semibold inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Target className="h-5 w-5" />}
            {loading ? "Starting checkout…" : "Book My Session — $97"}
          </button>
          {error && (
            <p className="text-red-400 text-sm mt-4" data-testid="text-strategy-error">{error}</p>
          )}
          <p className="text-white/30 text-xs mt-4">Secure your spot — limited launch availability.</p>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-8 text-center">What's included</h2>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6 md:p-8">
            <ul className="space-y-4">
              {INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(244,166,42,0.15)" }}>
                    <Check className="h-3 w-3" style={{ color: "#F4A62A" }} />
                  </span>
                  <span className="text-white/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-8 text-center">Who it's for</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[Zap, BrainCircuit, Rocket].map((Icon, i) => (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/3 p-6 text-center">
                <Icon className="h-7 w-7 mx-auto mb-3" style={{ color: "#F4A62A" }} />
                <p className="text-white/70 text-sm leading-relaxed">{FOR_YOU[i]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-8 text-center">Questions</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-white/8 bg-white/3 p-6">
                <h3 className="text-white font-bold font-heading mb-1">{f.q}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="rounded-2xl border border-white/10 p-8 md:p-10 text-center" style={{ background: "rgba(244,166,42,0.06)" }}>
            <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: "#F4A62A" }} />
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">Ready to grow with AI?</h2>
            <p className="text-white/55 max-w-lg mx-auto mb-6">
              Lock in the $97 launch price and walk away with a plan you can act on this month.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={startCheckout} disabled={loading} data-testid="button-strategy-cta-final"
                className="btn-primary px-8 py-3 rounded-full text-base font-semibold inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {loading ? "Starting checkout…" : "Book My Session — $97"}
              </button>
              <Link href="/about-founder" data-testid="button-strategy-about"
                className="px-6 py-3 rounded-full text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 transition inline-flex items-center gap-2">
                Meet your strategist <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-4 text-center" data-testid="text-strategy-error-final">{error}</p>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8 text-center">
        <p className="text-white/30 text-sm">© {new Date().getFullYear()} Elevate360Official · <Link href="/" className="hover:text-primary transition-colors">Back to site</Link></p>
      </footer>
    </div>
  );
}
