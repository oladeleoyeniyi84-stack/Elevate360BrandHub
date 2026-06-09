import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import {
  ArrowRight,
  BookOpen,
  Smartphone,
  Palette,
  Music,
  Sparkles,
  Target,
  Rocket,
} from "lucide-react";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const PILLARS = [
  { icon: Smartphone, title: "App Developer", body: "Builder of Bondedlove, Healthwisesupport, and Video Crafter — apps designed to connect, heal, and create." },
  { icon: BookOpen, title: "Published Author", body: "Amazon KDP author writing on wellness, relationships, and intentional living." },
  { icon: Palette, title: "Visual Artist", body: "Founder of Elevate360 Art Studio, producing original work sold worldwide on Etsy." },
  { icon: Music, title: "Music Producer", body: "Creator and producer with an original catalog published on Audiomack." },
];

const MILESTONES = [
  { stat: "3", label: "Mobile apps shipped" },
  { stat: "3+", label: "Books published" },
  { stat: "8", label: "Languages supported" },
  { stat: "1", label: "Mission: elevate the world" },
];

export default function AboutFounder() {
  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="About the Founder — Oladele Oyeniyi | Elevate360Official"
        description="Meet Oladele Oyeniyi, founder of Elevate360 — app developer, author, visual artist, and music producer building products that elevate everyday life."
        path="/about-founder"
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Oladele Oyeniyi",
            jobTitle: "Founder of Elevate360",
            worksFor: { "@type": "Organization", name: "Elevate360Official" },
            url: "https://www.elevate360official.com/about-founder",
          })}
        </script>
      </Helmet>

      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img src={brandLogo} alt="Elevate360" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/50 hover:text-white text-sm transition" data-testid="link-founder-home">Home</Link>
            <Link href="/knowledge" className="text-white/50 hover:text-white text-sm transition" data-testid="link-founder-knowledge">Knowledge</Link>
            <Link href="/strategy-session" className="text-white/50 hover:text-white text-sm transition" data-testid="link-founder-strategy">Strategy</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full flex items-center justify-center text-3xl font-bold font-heading mb-6"
              style={{ background: "rgba(244,166,42,0.15)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.3)" }}>
              OO
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              <Sparkles className="h-3 w-3" />
              Founder of Elevate360
            </span>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4" data-testid="text-founder-name">
              Oladele Oyeniyi
            </h1>
            <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
              Entrepreneur, app developer, author, visual artist, and music producer. I build products across
              technology, words, and art with a single mission — to{" "}
              <span style={{ color: "#F4A62A" }}>elevate the world, one product at a time.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-12 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {MILESTONES.map((m) => (
              <div key={m.label} className="text-center rounded-2xl border border-white/8 bg-white/3 p-6">
                <p className="text-3xl font-heading font-bold" style={{ color: "#F4A62A" }}>{m.stat}</p>
                <p className="text-white/50 text-xs mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <h2 className="text-2xl font-heading font-bold text-white mb-4">The story</h2>
          <p className="text-white/70 leading-relaxed mb-4">
            Elevate360 started with a simple conviction: that thoughtful digital products can genuinely improve everyday life.
            What began as a single app grew into an ecosystem spanning mobile software, published books, original art, and music —
            each project sharing the same standard of craft and care.
          </p>
          <p className="text-white/70 leading-relaxed mb-4">
            I work as a team of one amplified by modern tools, shipping products that used to require an entire studio.
            Every release is held to one test: does it actually elevate the person on the other side of the screen?
          </p>
          <blockquote className="border-l-4 pl-4 my-6 italic text-white/60" style={{ borderColor: "#F4A62A" }}>
            Elevate the world, one product at a time.
          </blockquote>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h2 className="text-2xl font-heading font-bold text-white mb-8 text-center">What I build</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-white/8 bg-white/3 p-6">
                <p.icon className="h-7 w-7 mb-3" style={{ color: "#F4A62A" }} />
                <h3 className="text-white font-bold font-heading text-lg mb-1">{p.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="rounded-2xl border border-white/10 p-8 md:p-10 text-center" style={{ background: "rgba(244,166,42,0.06)" }}>
            <Rocket className="h-8 w-8 mx-auto mb-3" style={{ color: "#F4A62A" }} />
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">Work with me directly</h2>
            <p className="text-white/55 max-w-lg mx-auto mb-6">
              Book an AI Growth Strategy Session, or explore the free Knowledge Center to start applying these ideas today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/strategy-session" data-testid="button-founder-strategy-session"
                className="btn-primary px-6 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2">
                <Target className="h-4 w-4" />
                Book a Strategy Session
              </Link>
              <Link href="/knowledge" data-testid="button-founder-knowledge"
                className="px-6 py-2.5 rounded-full text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 transition inline-flex items-center gap-2">
                Read the Knowledge Center <ArrowRight className="h-4 w-4" />
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
