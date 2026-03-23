import { useState, useEffect, useRef } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCountUp } from "@/hooks/useCountUp";
import { AIConcierge } from "@/components/AIConcierge";
import { Link } from "wouter";
import {
  ArrowRight,
  Smartphone,
  BookOpen,
  Instagram,
  Youtube,
  Palette,
  Music,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";
import { NewsletterForm } from "@/components/NewsletterForm";
import heroBg from "@/assets/images/hero-bg.png";
import appBondedlove from "@/assets/images/app-bondedlove.png";
import appHealthwise from "@/assets/images/app-healthwise.png";
import appVideoCrafter from "@/assets/images/app-videocrafter.png";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";
import artStudioImg from "@assets/Elevate360Art_Studio_Presentation_1772460961759.png";

const featuredBook =
  "https://m.media-amazon.com/images/I/41Ih48BpUEL._SY445_SX342_FMwebp_.jpg";
const bookTogether = "https://m.media-amazon.com/images/I/61XmcRNAyTL._SY466_.jpg";
const bookOneCleanMeal = "https://m.media-amazon.com/images/I/41zbjQDKkNL._SY466_.jpg";

interface StatCardProps {
  target: number;
  suffix?: string;
  label: string;
  description: string;
  emoji: string;
  delay?: string;
}

function StatCard({ target, suffix = "", label, description, emoji, delay = "0ms" }: StatCardProps) {
  const { count, ref } = useCountUp({ target, duration: 1600 });
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{ transitionDelay: delay }}
      className="reveal-scale flex flex-col items-center text-center gap-2 p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-colors duration-300"
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span className="text-3xl mb-1">{emoji}</span>
      <p className="text-4xl md:text-5xl font-heading font-extrabold text-primary tabular-nums leading-none">
        {count}{suffix}
      </p>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useScrollReveal();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      if (window.scrollY > 80) setMobileMenuOpen(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans safe-bottom luxury-bg">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          isScrolled
            ? "bg-gradient-to-b from-background/80 to-background/55 backdrop-blur-2xl border-white/10 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
            : "bg-transparent border-white/5 py-4"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center h-16 md:h-20">
          <Link href="/" data-testid="link-nav-logo" className="flex items-center">
            <img
              src={brandLogo}
              alt="Elevate360"
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#apps"
              data-testid="link-nav-apps"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Applications
            </a>
            <a
              href="#books"
              data-testid="link-nav-books"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Publications
            </a>
            <ContactDialog>
              <Button data-testid="button-get-in-touch" className="rounded-full px-6">
                Get in Touch
              </Button>
            </ContactDialog>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full border border-white/15 hover:bg-white/8 transition-colors"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile drawer */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-96 border-t border-white/10" : "max-h-0"
          }`}
        >
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1 bg-background/95 backdrop-blur-2xl">
            {[
              { href: "#apps", label: "Applications", icon: <Smartphone className="h-4 w-4" /> },
              { href: "#art-studio", label: "Art Studio", icon: <Palette className="h-4 w-4" /> },
              { href: "#music", label: "Music", icon: <Music className="h-4 w-4" /> },
              { href: "#books", label: "Publications", icon: <BookOpen className="h-4 w-4" /> },
            ].map(({ href, label, icon }) => (
              <a
                key={href}
                href={href}
                data-testid={`link-mobile-nav-${label.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                <span className="text-primary">{icon}</span>
                {label}
              </a>
            ))}
            <div className="pt-2 pb-1">
              <ContactDialog>
                <Button
                  data-testid="button-mobile-get-in-touch"
                  className="w-full rounded-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get in Touch
                </Button>
              </ContactDialog>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-56 md:pt-64 pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt="Abstract Background"
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background to-background"></div>
        </div>

        <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center z-0 pointer-events-none flex justify-center opacity-[0.04] dark:opacity-[0.03]">
          <span className="text-[16rem] md:text-[28rem] lg:text-[40rem] font-heading font-black leading-none whitespace-nowrap text-primary select-none -tracking-[0.05em]">
            ELEVATE
          </span>
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Innovating digital experiences
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-extrabold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Empowering Lives Through
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#ffe3a6] to-primary">
                Technology & Words
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-[1.9] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 font-light mt-8">
              Welcome to the official portfolio of Elevate360. Discover our suite of transformative
              mobile applications and insightful Amazon publications designed to elevate your
              everyday life.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <a href="#apps" data-testid="button-explore-apps" className="btn-primary w-full sm:w-auto">
                <Smartphone className="h-5 w-5" />
                Explore Apps
              </a>
              <a
                href="#books"
                data-testid="button-view-publications"
                className="btn-secondary w-full sm:w-auto"
              >
                <BookOpen className="h-5 w-5" />
                View Publications
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background border-t border-white/8">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase mb-8">
            Elevate360 By The Numbers
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              target={3}
              label="Mobile Apps"
              description="Purpose-built apps connecting, healing & inspiring"
              emoji="📱"
              delay="0ms"
            />
            <StatCard
              target={3}
              label="Books Published"
              description="Health, relationships & clean living on Amazon"
              emoji="📚"
              delay="100ms"
            />
            <StatCard
              target={1}
              label="Art Studio"
              description="Original digital art & prints on Etsy"
              emoji="🎨"
              delay="200ms"
            />
            <StatCard
              target={4}
              label="Music Genres"
              description="Afrobeat · Amapiano · R&B · Hip-Hop on Audiomack"
              emoji="🎵"
              delay="300ms"
            />
          </div>
        </div>
      </section>

      {/* Apps Section */}
      <section id="apps" className="py-20 bg-background border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 reveal">
            <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">Our Digital Ecosystem</h2>
            <p className="text-lg text-muted-foreground">
              Purpose-built applications designed to connect, heal, and inspire creativity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {/* Bondedlove */}
            <a
              href="https://bondedlove.elevate360official.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Bondedlove web app"
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer reveal reveal-delay-1"
            >
              <div className="aspect-[4/3] w-full overflow-hidden lux-panel flex items-center justify-center p-8">
                <img
                  src={appBondedlove}
                  alt="Bondedlove App"
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.015]"
                />
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mb-6">
                  <div className="w-6 h-6 bg-rose-500 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3">Bondedlove</h3>
                <p className="text-muted-foreground mb-6 line-clamp-3">
                  A revolutionary dating application focused on fostering genuine, lasting connections.
                  Find your perfect match through meaningful interactions.
                </p>
                <span className="btn-tertiary mt-auto">
                  Open app <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </a>

            {/* Healthwisesupport */}
            <a
              href="https://health.elevate360official.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Healthwisesupport web app"
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer reveal reveal-delay-2"
            >
              <div className="aspect-[4/3] w-full overflow-hidden lux-panel flex items-center justify-center p-8">
                <img
                  src={appHealthwise}
                  alt="Healthwisesupport App"
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.015]"
                />
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center mb-6">
                  <div className="w-6 h-6 bg-teal-500 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3">Healthwisesupport</h3>
                <p className="text-muted-foreground mb-6 line-clamp-3">
                  Your comprehensive health wellness companion. Access medical support, track your wellness
                  journey, and connect with healthcare professionals.
                </p>
                <span className="btn-tertiary mt-auto">
                  Open app <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </a>

            {/* Video Crafter */}
            <a
              href="https://crafter.elevate360official.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Video Crafter web app"
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer reveal reveal-delay-3"
            >
              <div className="aspect-[4/3] w-full overflow-hidden lux-panel flex items-center justify-center p-8">
                <img
                  src={appVideoCrafter}
                  alt="Video Crafter App"
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.015]"
                />
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6">
                  <div className="w-6 h-6 bg-indigo-500 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3">Video Crafter</h3>
                <p className="text-muted-foreground mb-6 line-clamp-3">
                  Unleash your creativity with our intuitive video editing suite. Professional-grade tools made
                  accessible for creators of all levels.
                </p>
                <span className="btn-tertiary mt-auto">
                  Open app <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Art Studio Section */}
      <section id="art-studio" className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-amber-900/30 via-card to-card border border-amber-700/20 p-8 md:p-16">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/2 space-y-6 reveal-left">
                <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <Palette className="h-4 w-4 mr-2" />
                  Now on Etsy
                </div>
                <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">
                  Elevate360 <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                    Art Studio
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Explore our exclusive collection of digital art, creative designs, and handcrafted visuals. From
                  wall art to custom prints, each piece is designed to inspire and elevate your space.
                </p>
                <ul className="space-y-3">
                  {[
                    "Original digital artwork & prints",
                    "Custom creative designs",
                    "Unique handcrafted visuals",
                    "New pieces added regularly",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-foreground font-medium">
                      <div className="mr-3 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">
                        ✓
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <a
                    href="https://www.etsy.com/shop/Elevate360Official?sort_order=date_desc"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-etsy-shop"
                    className="btn-primary shadow-lg hover:shadow-xl"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Visit Art Studio on Etsy
                  </a>
                </div>
              </div>

              <div className="w-full md:w-1/2 reveal-right">
                <img
                  src={artStudioImg}
                  alt="Elevate360 Art Studio - Art speaks where words fall short"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                  data-testid="img-art-studio"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Music Section */}
      <section id="music" className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-violet-900/30 via-card to-card border border-violet-700/20 p-8 md:p-16">
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl -translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-primary/8 to-transparent rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/2 space-y-6 reveal-left">
                <div className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
                  <Music className="h-4 w-4 mr-2" />
                  Now on Audiomack
                </div>
                <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">
                  Elevate360 <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-[#ffe3a6] to-violet-400">
                    Music
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  The sound of energy, elevation, and creative expression. Built under the Elevate360 brand, we release
                  vibe-rich music crafted for inspiration, momentum, and atmosphere. Press play and elevate your world.
                </p>
                <ul className="space-y-3">
                  {[
                    "Afrobeat, Amapiano & Highlife grooves",
                    "R&B, Neo-Soul & Chill vibes",
                    "Hip-Hop, Trap & Lo-Fi beats",
                    "Electronic, House & Dance energy",
                    "Original productions for every mood",
                    "New tracks released regularly",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-foreground font-medium">
                      <div className="mr-3 h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-300 text-sm">
                        ✓
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <a
                    href="https://audiomack.com/elevate360music"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-audiomack"
                    className="btn-primary shadow-lg hover:shadow-xl"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Listen on Audiomack
                  </a>
                </div>
              </div>

              <div className="w-full md:w-1/2 flex justify-center reveal-right">
                <div className="relative w-full max-w-md space-y-3">
                  <div className="overflow-hidden rounded-3xl border border-violet-500/20 shadow-2xl shadow-violet-900/30">
                    <iframe
                      src="https://audiomack.com/embed/artist-page/elevate360music"
                      width="100%"
                      height="420"
                      scrolling="no"
                      allow="autoplay"
                      title="Elevate360 Music on Audiomack"
                      className="block"
                      style={{ border: 0 }}
                      data-testid="iframe-audiomack-player"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                    <Music className="h-3 w-3 text-violet-400" />
                    Streaming live · Powered by Audiomack
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Publications Section */}
      <section id="books" className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-16 mb-16">
            <div className="w-full md:w-1/2 space-y-8 reveal-left">
              <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-600 mb-2">
                Available on Amazon KDP
              </div>
              <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">
                Insights & Inspiration
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Dive deep into our collection of eBooks and hardcover publications. Whether you're looking for guidance,
                knowledge, or inspiration, our carefully crafted books are designed to elevate your understanding.
              </p>

              <ul className="space-y-4">
                {[
                  "Expertly researched content",
                  "Available in digital and physical formats",
                  "Actionable insights for personal growth",
                  "Highly rated by readers globally",
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-foreground font-medium">
                    <div className="mr-3 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      ✓
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <a
                  href="https://www.amazon.com/stores/Oladele-Oyeniyi/author/B0GCMSCWPV?ref=ap_rdr&shoppingPortalEnabled=true&ccs_id=6b61ffb3-1a86-4ecc-a3b9-bcb63f0525ae"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-amazon-author-central"
                  className="btn-primary"
                >
                  Visit Author Central on Amazon
                </a>
              </div>
            </div>

            <div className="w-full md:w-1/2 relative reveal-right">
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <img
                  src={featuredBook}
                  alt="Healthwise: Stay Healthy"
                  className="w-full h-auto rounded-xl shadow-xl transform translate-y-8 hover:-translate-y-2 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="space-y-4">
                  <img
                    src={bookTogether}
                    alt="Together: Let There Be Love"
                    className="w-full h-auto rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-500"
                    loading="lazy"
                  />
                  <img
                    src={bookOneCleanMeal}
                    alt="One Clean Meal"
                    className="w-full h-auto rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-tr from-[#F4A62A]/15 to-transparent rounded-[3rem] -rotate-6 scale-105 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Book Section - Healthwise */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="lux-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden reveal-scale">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img
                    src={featuredBook}
                    alt="Featured Book Cover"
                    className="relative w-64 md:w-72 h-auto rounded-md shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] group-hover:-rotate-2"
                    loading="lazy"
                  />
                  <div className="absolute -top-4 -right-4">
                    <span className="badge-gold shadow-lg transform rotate-12 inline-block">Featured Release</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-2/3 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge-gold">Featured Release</span>
                  <a
                    href="https://www.amazon.com/dp/B0GMBNPZC9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors"
                  >
                    Rated on Amazon
                  </a>
                </div>

                <div>
                  <h3 className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Health & Wellness</h3>
                  <h4 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight mb-4">
                    Healthwise: <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-500">
                      Stay Healthy
                    </span>
                  </h4>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Your body has been speaking to you for years. Are you finally ready to listen? Healthwise: A Practical
                  Guide to Understanding Your Body and Protecting Your Health walks you through how your body is
                  organized, why common symptoms appear, and how everyday choices quietly shape your long-term wellbeing.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <a
                    href="https://www.amazon.com/dp/B0GMBNPZC9"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-buy-healthwise"
                    className="btn-primary"
                  >
                    Buy on Amazon
                  </a>
                  <a
                    href="https://www.amazon.com/dp/B0GMBNPZC9"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-preview-healthwise"
                    className="btn-secondary"
                  >
                    Preview on Amazon
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Book Section - Together: Let There Be Love */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="lux-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden reveal-scale reveal-delay-1">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-rose-400/5 to-transparent rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-4 bg-gradient-to-l from-rose-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img
                    src={bookTogether}
                    alt="Together: Let There Be Love Cover"
                    className="relative w-64 md:w-72 h-auto rounded-md shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] group-hover:rotate-2"
                    loading="lazy"
                  />
                  <div className="absolute -top-4 -left-4">
                    <span className="badge-gold shadow-lg transform -rotate-12 inline-block">Reader Favorite</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-2/3 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge-gold">Reader Favorite</span>
                  <a
                    href="https://www.amazon.com/dp/B0G5DWG61V"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors"
                  >
                    Rated on Amazon
                  </a>
                </div>

                <div>
                  <h3 className="text-xs font-bold tracking-widest text-rose-500 uppercase mb-3">
                    Relationships & Marriage
                  </h3>
                  <h4 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight mb-4">
                    Together: <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#ffe3a6] to-primary">
                      Let There Be Love
                    </span>
                  </h4>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Are you tired of feeling like roommates instead of soulmates? Together: Let There Be Love is a
                  practical, heart-centered relationship handbook for couples who are ready to build deeper connection,
                  healthier communication, and a love that actually lasts.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <a
                    href="https://www.amazon.com/dp/B0G5DWG61V"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-buy-together"
                    className="btn-primary"
                  >
                    Buy on Amazon
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Book Section - One Clean Meal */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="lux-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden reveal-scale reveal-delay-2">
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-emerald-400/5 to-transparent rounded-full blur-3xl translate-y-1/3 translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img
                    src={bookOneCleanMeal}
                    alt="One Clean Meal Cover"
                    className="relative w-64 md:w-72 h-auto rounded-md shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] group-hover:-rotate-2"
                    loading="lazy"
                  />
                  <div className="absolute -bottom-4 -right-4">
                    <span className="badge-gold shadow-lg transform rotate-6 inline-block">New Release</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-2/3 space-y-6">
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3">
                    Diet & Weight Loss
                  </h3>
                  <h4 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight mb-4">
                    One Clean Meal: <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9bd7c5] via-[#ffe3a6] to-[#9bd7c5]">
                      A 7-Day Reset
                    </span>
                  </h4>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Simple daily habits for better health & energy. Kickstart your wellness journey with actionable,
                  easy-to-follow steps to improve your diet without the overwhelm. Perfect for busy adults looking to
                  reset their health through manageable, one-meal-at-a-time changes.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <a
                    href="https://www.amazon.com/dp/B0FSDTPVJC"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-buy-onecleanmeal"
                    className="btn-primary"
                  >
                    Buy on Amazon
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background to-[#070b13] border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight mb-6 text-white reveal">
            Ready to Elevate Your Experience?
          </h2>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
            Subscribe to stay updated on new apps, book releases, and exclusive content from Elevate360.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#070b13] border-t border-white/8 pt-16 pb-8">
        <div className="container mx-auto px-4 md:px-6">

          {/* Main grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">

            {/* Brand column */}
            <div className="col-span-2 md:col-span-1 flex flex-col gap-5">
              <img
                src={brandLogo}
                alt="Elevate360Official"
                className="h-14 w-auto object-contain object-left"
              />
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
                Empowering lives through technology, creativity, and words. By Oladele Oyeniyi.
              </p>
              <Link
                href="/links"
                data-testid="link-footer-linkinbio"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-[#ffb84d] transition-colors"
              >
                🔗 All Links · elevate360official.com/links
              </Link>
              {/* Social icons */}
              <div className="flex items-center gap-3 pt-1">
                {[
                  { href: "https://www.instagram.com/officialelevate360/", Icon: Instagram, label: "Instagram", testid: "link-instagram" },
                  { href: "https://www.youtube.com/channel/UCDGnUhgvM__6Mw8q26H-urQ", Icon: Youtube, label: "YouTube", testid: "link-youtube" },
                  { href: "https://audiomack.com/elevate360music", Icon: Music, label: "Audiomack", testid: "link-audiomack-footer" },
                  { href: "https://www.etsy.com/shop/Elevate360Official", Icon: Palette, label: "Etsy", testid: "link-etsy" },
                ].map(({ href, Icon, label, testid }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    data-testid={testid}
                    className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Explore column */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase mb-1">Explore</p>
              {[
                { href: "#apps", label: "Applications" },
                { href: "#art-studio", label: "Art Studio" },
                { href: "#music", label: "Music" },
                { href: "#books", label: "Publications" },
              ].map(({ href, label }) => (
                <a key={label} href={href} data-testid={`link-footer-${label.toLowerCase()}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</a>
              ))}
              <ContactDialog>
                <button data-testid="button-footer-contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer">
                  Get in Touch
                </button>
              </ContactDialog>
            </div>

            {/* Apps column */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase mb-1">Our Apps</p>
              {[
                { href: "https://bondedlove.elevate360official.com", label: "Bondedlove" },
                { href: "https://health.elevate360official.com", label: "Healthwisesupport" },
                { href: "https://crafter.elevate360official.com", label: "Video Crafter" },
              ].map(({ href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  data-testid={`link-footer-app-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group">
                  {label}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </a>
              ))}
            </div>

            {/* Books column */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase mb-1">Books</p>
              {[
                { href: "https://www.amazon.com/dp/B0GMBNPZC9", label: "Healthwise: Stay Healthy" },
                { href: "https://www.amazon.com/dp/B0G5DWG61V", label: "Together: Let There Be Love" },
                { href: "https://www.amazon.com/dp/B0FSDTPVJC", label: "One Clean Meal" },
                { href: "https://www.amazon.com/stores/Oladele-Oyeniyi/author/B0GCMSCWPV", label: "Author Central →" },
              ].map(({ href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  data-testid={`link-footer-book-${label.toLowerCase().replace(/[\s:]+/g, "-")}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group">
                  {label}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Elevate360Official · Oladele Oyeniyi · All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/40 italic">
              Elevate the world, one product at a time.
            </p>
          </div>
        </div>
      </footer>

      <AIConcierge />
    </div>
  );
}
