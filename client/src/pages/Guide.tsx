import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import { ArrowRight, Check, Loader2, BookOpen, Download, MailCheck, Sparkles, Zap, BrainCircuit } from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const GUIDE_SLUG = "ai-growth-playbook";

const INSIDE = [
  "The 5 highest-leverage places to apply AI in a small brand",
  "A copy-paste prompt library for content, support, and research",
  "How to automate repeatable busywork without a dev team",
  "A simple 30-day rollout plan you can start this week",
  "The tools we actually use at Elevate360 — and why",
];

const FOR_YOU = [
  "Founders who want results from AI, not more hype",
  "Creators ready to automate the boring 80%",
  "Teams looking for a clear, practical starting point",
];

export default function Guide() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          guideSlug: GUIDE_SLUG,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setDone(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="Free AI Growth Playbook | Elevate360Official"
        description="Get the free AI Growth Playbook — the 5 highest-leverage ways to apply AI in your brand, a prompt library, and a simple 30-day rollout plan."
        path="/guide"
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "The AI Growth Playbook",
            description: "A free practical guide to applying AI and automation to grow a small brand.",
            author: { "@type": "Organization", name: "Elevate360Official" },
          })}
        </script>
      </Helmet>

      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/50 hover:text-white text-sm transition" data-testid="link-guide-home">Home</Link>
            <Link href="/strategy-session" className="text-white/50 hover:text-white text-sm transition" data-testid="link-guide-strategy">Strategy Session</Link>
            <Link href="/knowledge" className="text-white/50 hover:text-white text-sm transition" data-testid="link-guide-knowledge">Knowledge</Link>
          </div>
        </div>
      </header>

      {/* Hero + opt-in */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-5"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              <BookOpen className="h-3 w-3" />
              Free Guide
            </span>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-5 leading-tight">
              The AI Growth{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">Playbook</span>
            </h1>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              A practical, no-fluff guide to applying AI and automation in your brand —
              the exact moves we use at Elevate360, distilled into a plan you can start this week.
            </p>
            <ul className="space-y-3">
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
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/10 p-6 md:p-8" style={{ background: "rgba(244,166,42,0.06)" }}>
            {done ? (
              <div className="text-center py-6" data-testid="status-guide-success">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "rgba(244,166,42,0.15)" }}>
                  <MailCheck className="h-7 w-7" style={{ color: "#F4A62A" }} />
                </span>
                <h2 className="text-2xl font-heading font-bold text-white mb-2">Check your email</h2>
                <p className="text-white/60 leading-relaxed mb-6">
                  Your AI Growth Playbook is on its way. If you don't see it in a few minutes,
                  check your spam folder.
                </p>
                <Link href="/strategy-session" data-testid="button-guide-strategy-cta"
                  className="btn-primary px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2">
                  Want a custom plan? Book a session <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5" style={{ color: "#F4A62A" }} />
                  <h2 className="text-xl font-heading font-bold text-white">Get the free guide</h2>
                </div>
                <p className="text-white/50 text-sm">We'll email it to you instantly. No spam — unsubscribe anytime.</p>
                <div>
                  <label htmlFor="guide-name" className="block text-white/60 text-sm mb-1">Name <span className="text-white/30">(optional)</span></label>
                  <input
                    id="guide-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-guide-name"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 transition"
                    placeholder="Your name"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label htmlFor="guide-email" className="block text-white/60 text-sm mb-1">Email</label>
                  <input
                    id="guide-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-guide-email"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 transition"
                    placeholder="you@example.com"
                    maxLength={255}
                  />
                </div>
                <button type="submit" disabled={loading} data-testid="button-guide-submit"
                  className="btn-primary w-full px-6 py-3 rounded-full text-base font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  {loading ? "Sending your guide..." : "Send Me the Playbook"}
                </button>
                {error && (
                  <p className="text-red-400 text-sm" data-testid="text-guide-error">{error}</p>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-8 text-center">Who it's for</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[Zap, BrainCircuit, Sparkles].map((Icon, i) => (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/3 p-6 text-center">
                <Icon className="h-7 w-7 mx-auto mb-3" style={{ color: "#F4A62A" }} />
                <p className="text-white/70 text-sm leading-relaxed">{FOR_YOU[i]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8 text-center">
        <p className="text-white/30 text-sm">© {new Date().getFullYear()} Elevate360Official · <Link href="/" className="hover:text-primary transition-colors">Back to site</Link></p>
      </footer>
    </div>
  );
}
