import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import type { Testimonial } from "@shared/schema";
import SEO from "@/components/SEO";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCountUp } from "@/hooks/useCountUp";
import { useTrackClick } from "@/hooks/useTrackClick";
import { useTrackPageView } from "@/hooks/useTrackPageView";
import { AIConcierge } from "@/components/AIConcierge";
import { SessionPresenceCard } from "@/components/concierge/SessionPresenceCard";
import { type ConciergeModeKey, SESSION_MODE_MAP } from "@/config/conciergeModes";
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
  Star,
  Handshake,
  Mic,
  TrendingUp,
  Zap,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ShareButton } from "@/components/ShareButton";
import { FAQSection } from "@/components/FAQSection";
import { CommissionDialog } from "@/components/CommissionDialog";
import { ScreenshotsButton, type LightboxImage } from "@/components/Lightbox";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
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

type ConsultationItem = {
  id: number;
  title: string;
  price: number;
  currency: string;
  duration: number;
  description: string;
  tag?: string | null;
};

function ConsultationGrid({
  consultations,
  onBook,
}: {
  consultations: ConsultationItem[];
  onBook: (c: ConsultationItem) => void;
}) {
  const [activeMode, setActiveMode] = useState<ConciergeModeKey>("default");
  const COLORS = ["#F4A62A", "#22c55e", "#38bdf8", "#a78bfa", "#fb923c", "#f472b6"];

  const handleCardEnter = (title: string) => {
    const mapped = SESSION_MODE_MAP[title] ?? "default";
    setActiveMode(mapped);
  };

  const handleCardSelect = (c: ConsultationItem) => {
    const mapped = SESSION_MODE_MAP[c.title] ?? "default";
    setActiveMode(mapped);
    window.dispatchEvent(
      new CustomEvent("e360:set-concierge-mode", { detail: { mode: mapped } })
    );
    onBook(c);
  };

  return (
    <div className="space-y-6 reveal">
      {/* Active session presence card */}
      {activeMode !== "default" && (
        <div className="max-w-lg mx-auto transition-all duration-300">
          <SessionPresenceCard mode={activeMode} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {consultations.map((c, idx) => {
          const isFree = c.price === 0;
          const priceLabel = isFree ? "Free" : `$${(c.price / 100).toFixed(0)}`;
          const accent = COLORS[idx % COLORS.length];
          const isActive = SESSION_MODE_MAP[c.title] === activeMode;
          return (
            <div
              key={c.id}
              className="lux-card flex flex-col p-6 gap-4 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              data-testid={`card-consultation-${c.id}`}
              style={{
                borderTop: `2px solid ${accent}${isActive ? "80" : "30"}`,
                boxShadow: isActive ? `0 0 0 1px ${accent}30, 0 8px 24px rgba(0,0,0,0.25)` : undefined,
              }}
              onMouseEnter={() => handleCardEnter(c.title)}
              onFocus={() => handleCardEnter(c.title)}
            >
              {c.tag && (
                <span
                  className="self-start text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: `${accent}20`, color: accent }}
                >
                  {c.tag}
                </span>
              )}
              <h3 className="text-white font-heading font-bold text-lg leading-tight">{c.title}</h3>
              <p className="text-white/50 text-sm flex-1">{c.description}</p>
              <div className="flex items-center gap-4 text-sm mt-auto">
                <span className="flex items-center gap-1.5 text-white/40">
                  <Clock className="w-3.5 h-3.5" />
                  {c.duration} min
                </span>
                <span className="ml-auto font-bold text-xl" style={{ color: accent }}>
                  {priceLabel}
                </span>
              </div>
              <button
                data-testid={`btn-book-${c.id}`}
                onClick={() => handleCardSelect(c)}
                className="btn-primary w-full mt-2 flex items-center justify-center gap-2 text-sm"
              >
                <Calendar className="w-4 h-4" /> Book This Session
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);

  // Phase 36 — Booking modal state
  const [bookingConsultation, setBookingConsultation] = useState<null | { id: number; title: string; price: number; currency: string; duration: number; description: string }>(null);
  const [bookingForm, setBookingForm] = useState({ name: "", email: "", preferredDate: "", message: "" });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const trackClick = useTrackClick();
  useTrackPageView("home");

  const { lang, setLang, t } = useLanguage();

  const APP_SCREENSHOTS: Record<string, LightboxImage[]> = {
    Bondedlove: [
      { src: appBondedlove, alt: "Bondedlove app main screen", caption: "Bondedlove — Couples connection app" },
    ],
    Healthwisesupport: [
      { src: appHealthwise, alt: "Healthwisesupport app main screen", caption: "Healthwisesupport — Wellness tracking" },
    ],
    "Video Crafter": [
      { src: appVideoCrafter, alt: "Video Crafter app main screen", caption: "Video Crafter — Creative video editing" },
    ],
  };

  const { data: testimonialData = [] } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
    queryFn: async () => {
      const res = await fetch("/api/testimonials");
      if (!res.ok) return [];
      return res.json();
    },
  });
  // Phase 37 — Stripe offers
  const { data: offers = [] } = useQuery<{
    productId: string; priceId: string; name: string; description: string | null;
    amount: number; currency: string;
    metadata: Record<string, string>;
  }[]>({
    queryKey: ["/api/offers"],
    queryFn: async () => {
      const res = await fetch("/api/offers");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const [buyingOffer, setBuyingOffer] = useState<string | null>(null); // priceId being processed

  const handleBuyNow = async (priceId: string, productName: string, amount?: number) => {
    setBuyingOffer(priceId);
    try {
      const chatSessionId = sessionStorage.getItem("e360_chat_session");
      // Phase 41 — store offer for acceptance attribution on success page
      sessionStorage.setItem("e360_last_offer", productName);
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, productName, amount, sessionId: chatSessionId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setBuyingOffer(null);
    }
  };

  const { data: consultations = [] } = useQuery<{ id: number; title: string; price: number; currency: string; duration: number; description: string; tag?: string | null }[]>({
    queryKey: ["/api/consultations"],
    queryFn: async () => {
      const res = await fetch("/api/consultations");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (payload: { consultationId: number; clientName: string; clientEmail: string; preferredDate?: string; message?: string }) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Booking failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setBookingSuccess(true);
      setBookingSubmitting(false);
      setBookingForm({ name: "", email: "", preferredDate: "", message: "" });
    },
    onError: (e: Error) => {
      setBookingError(e.message);
      setBookingSubmitting(false);
    },
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingConsultation) return;
    setBookingSubmitting(true);
    setBookingError("");
    bookingMutation.mutate({
      consultationId: bookingConsultation.id,
      clientName: bookingForm.name,
      clientEmail: bookingForm.email,
      preferredDate: bookingForm.preferredDate || undefined,
      message: bookingForm.message || undefined,
    });
  };

  useScrollReveal();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      if (window.scrollY > 80) setMobileMenuOpen(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans safe-bottom luxury-bg">
      <SEO
        title="Elevate360Official | Empowering Lives Through Technology & Words"
        description="Explore Elevate360Official — a premium digital ecosystem of apps, books, music, art, and creative experiences by Oladele Oyeniyi designed to connect, heal, inspire, and elevate everyday life."
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Oladele Oyeniyi",
            jobTitle: "Founder, Entrepreneur, Author, App Developer, Visual Artist, Music Producer",
            worksFor: { "@type": "Organization", name: "Elevate360Official" },
            url: "https://www.elevate360official.com/",
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Elevate360Official Digital Ecosystem",
            itemListElement: [
              { "@type": "SoftwareApplication", position: 1, name: "Bondedlove", applicationCategory: "LifestyleApplication" },
              { "@type": "SoftwareApplication", position: 2, name: "Healthwisesupport", applicationCategory: "HealthApplication" },
              { "@type": "SoftwareApplication", position: 3, name: "Video Crafter", applicationCategory: "MultimediaApplication" },
              { "@type": "Book", position: 4, name: "Healthwise: Stay Healthy" },
              { "@type": "Book", position: 5, name: "Together: Let There Be Love" },
              { "@type": "Book", position: 6, name: "One Clean Meal: A 7-Day Reset" },
            ],
          })}
        </script>
      </Helmet>
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

          <div className="hidden md:flex items-center space-x-6">
            <a href="#apps" data-testid="link-nav-apps" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav_apps")}
            </a>
            <a href="#books" data-testid="link-nav-books" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav_books")}
            </a>
            <Link href="/blog" data-testid="link-nav-blog" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav_blog")}
            </Link>
            <a href="#offers" data-testid="link-nav-offers"
              className="text-sm font-medium hover:text-primary transition-colors">
              Shop
            </a>
            <a href="#book-session" data-testid="link-nav-book"
              className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.3)" }}>
              Book a Session
            </a>
            {/* Language switcher */}
            <div ref={langRef} className="relative" data-testid="lang-switcher">
              <button
                onClick={() => setLangOpen((o) => !o)}
                data-testid="button-lang-toggle"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 text-xs font-bold text-white/70 hover:text-white hover:border-white/30 transition-colors"
                aria-label="Select language"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                {LANGUAGES.find((l) => l.code === lang)?.native ?? "EN"}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${langOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-background/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-50">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      data-testid={`button-lang-${l.code}`}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/8 ${lang === l.code ? "text-primary font-semibold" : "text-white/70"}`}
                    >
                      <span>{l.label}</span>
                      <span className="text-xs font-bold opacity-50">{l.native}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ContactDialog>
              <Button data-testid="button-get-in-touch" className="rounded-full px-6">
                {t("nav_contact")}
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
            mobileMenuOpen ? "max-h-[520px] border-t border-white/10" : "max-h-0"
          }`}
        >
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1 bg-background/95 backdrop-blur-2xl">
            {[
              { href: "#apps", label: "Applications", icon: <Smartphone className="h-4 w-4" /> },
              { href: "#art-studio", label: "Art Studio", icon: <Palette className="h-4 w-4" /> },
              { href: "#music", label: "Music", icon: <Music className="h-4 w-4" /> },
              { href: "#books", label: "Publications", icon: <BookOpen className="h-4 w-4" /> },
              { href: "#offers", label: "Shop Offers", icon: <Zap className="h-4 w-4" /> },
              { href: "#book-session", label: "Book a Session", icon: <Calendar className="h-4 w-4" /> },
            ].map(({ href, label, icon }) => (
              <a
                key={href}
                href={href}
                data-testid={`link-mobile-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                <span className="text-primary">{icon}</span>
                {label}
              </a>
            ))}
            {/* Mobile language picker */}
            <div className="pt-2 border-t border-white/10">
              <p className="px-4 pb-2 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Language</p>
              <div className="grid grid-cols-4 gap-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setMobileMenuOpen(false); }}
                    data-testid={`button-mobile-lang-${l.code}`}
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${lang === l.code ? "bg-primary text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
            </div>
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
            alt="Elevate360Official premium digital ecosystem hero background"
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

      {/* Testimonials Section */}
      <section className="py-20 border-t border-white/10 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3 reveal">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">What People Are Saying</p>
            <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">Trusted by Thousands</h2>
            <p className="text-muted-foreground text-lg">Real reviews from real users across our apps, books, and creative work.</p>
          </div>

          {/* Scrollable row on mobile, 3-col grid on md+ */}
          <div className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory md:overflow-visible scrollbar-hide">

            {/* Testimonial 1 — Bondedlove */}
            <div className="lux-card rounded-3xl p-7 flex-none w-[82vw] sm:w-[60vw] md:w-auto snap-start reveal reveal-delay-1">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-base leading-relaxed text-foreground/90 mb-6">
                "Bondedlove helped me reconnect with my partner in a way I didn't expect from an app. The prompts are thoughtful and the interface feels warm — not cold and clinical like most dating apps."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm select-none">AM</div>
                <div>
                  <p className="font-semibold text-sm">Amara M.</p>
                  <p className="text-xs text-muted-foreground">Bondedlove User · Lagos, Nigeria</p>
                </div>
              </div>
              <span className="mt-5 inline-block text-xs font-semibold tracking-wide text-primary/80 bg-primary/10 px-3 py-1 rounded-full">📱 Bondedlove</span>
            </div>

            {/* Testimonial 2 — Healthwisesupport */}
            <div className="lux-card rounded-3xl p-7 flex-none w-[82vw] sm:w-[60vw] md:w-auto snap-start reveal reveal-delay-2">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-base leading-relaxed text-foreground/90 mb-6">
                "I've been using Healthwisesupport for my daily wellness tracking and it has changed how I think about self-care. Simple, effective, and genuinely encouraging."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm select-none">TK</div>
                <div>
                  <p className="font-semibold text-sm">Tunde K.</p>
                  <p className="text-xs text-muted-foreground">Healthwisesupport User · Abuja, Nigeria</p>
                </div>
              </div>
              <span className="mt-5 inline-block text-xs font-semibold tracking-wide text-teal-400/80 bg-teal-500/10 px-3 py-1 rounded-full">🌿 Healthwisesupport</span>
            </div>

            {/* Testimonial 3 — Healthwise book */}
            <div className="lux-card rounded-3xl p-7 flex-none w-[82vw] sm:w-[60vw] md:w-auto snap-start reveal reveal-delay-3">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-base leading-relaxed text-foreground/90 mb-6">
                "Healthwise: Stay Healthy is one of the clearest, most practical health books I've read. It cuts through the noise and gives you real, actionable guidance. A must-read."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm select-none">SC</div>
                <div>
                  <p className="font-semibold text-sm">Sarah C.</p>
                  <p className="text-xs text-muted-foreground">Amazon Verified Purchase · UK</p>
                </div>
              </div>
              <span className="mt-5 inline-block text-xs font-semibold tracking-wide text-amber-400/80 bg-amber-500/10 px-3 py-1 rounded-full">📚 Healthwise: Stay Healthy</span>
            </div>

            {/* Testimonial 4 — Together book */}
            <div className="lux-card rounded-3xl p-7 flex-none w-[82vw] sm:w-[60vw] md:w-auto snap-start md:col-start-1 reveal">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-base leading-relaxed text-foreground/90 mb-6">
                "Together: Let There Be Love spoke to something my partner and I had been struggling to put into words for months. We've been using it as a conversation guide and it's been transformative."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm select-none">JO</div>
                <div>
                  <p className="font-semibold text-sm">Jide & Ola</p>
                  <p className="text-xs text-muted-foreground">Amazon Verified Purchase · Canada</p>
                </div>
              </div>
              <span className="mt-5 inline-block text-xs font-semibold tracking-wide text-rose-400/80 bg-rose-500/10 px-3 py-1 rounded-full">❤️ Together: Let There Be Love</span>
            </div>

            {/* Testimonial 5 — Video Crafter */}
            <div className="lux-card rounded-3xl p-7 flex-none w-[82vw] sm:w-[60vw] md:w-auto snap-start reveal reveal-delay-1">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-base leading-relaxed text-foreground/90 mb-6">
                "Video Crafter gave me the tools I needed to produce content that actually looks professional. I went from shaky clips to polished reels in a week. My followers noticed immediately."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm select-none">DN</div>
                <div>
                  <p className="font-semibold text-sm">David N.</p>
                  <p className="text-xs text-muted-foreground">Video Crafter User · Atlanta, USA</p>
                </div>
              </div>
              <span className="mt-5 inline-block text-xs font-semibold tracking-wide text-indigo-400/80 bg-indigo-500/10 px-3 py-1 rounded-full">🎬 Video Crafter</span>
            </div>

            {/* Testimonial 6 — One Clean Meal */}
            <div className="lux-card rounded-3xl p-7 flex-none w-[82vw] sm:w-[60vw] md:w-auto snap-start reveal reveal-delay-2">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-base leading-relaxed text-foreground/90 mb-6">
                "One Clean Meal is the most honest nutrition reset book I've ever read. No guilt, no extreme diets — just practical steps that actually fit into a busy lifestyle. I feel completely different after the 7 days."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm select-none">FB</div>
                <div>
                  <p className="font-semibold text-sm">Fatima B.</p>
                  <p className="text-xs text-muted-foreground">Amazon Verified Purchase · Dubai, UAE</p>
                </div>
              </div>
              <span className="mt-5 inline-block text-xs font-semibold tracking-wide text-emerald-400/80 bg-emerald-500/10 px-3 py-1 rounded-full">🥗 One Clean Meal</span>
            </div>

          </div>

          {/* Trust badges row */}
          <div className="flex flex-wrap justify-center items-center gap-6 mt-14 reveal">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["AM","TK","SC","JO","DN","FB"].map((initials, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                    {initials}
                  </div>
                ))}
              </div>
              <span className="ml-1 font-medium text-foreground">10,000+ happy users</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />)}
              </div>
              <span>4.9 average rating</span>
            </div>
            <div className="badge-gold text-xs px-4 py-1.5">⭐ Amazon Best Seller Picks</div>
          </div>
        </div>
      </section>

      {/* YouTube Section */}
      <section id="youtube" className="py-20 border-t border-white/8" style={{ background: "hsl(220 50% 7%)" }}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 reveal">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              <Youtube className="h-3 w-3" />
              YouTube
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
              {t("section_youtube")}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">{t("section_youtube_sub")}</p>
          </div>
          <div className="max-w-3xl mx-auto reveal">
            {/* YouTube channel card — replaces broken playlist embed */}
            <a
              href="https://www.youtube.com/@Elevate360Official"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-youtube-channel"
              className="group block relative rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              style={{ background: "hsl(220 50% 6%)" }}
            >
              {/* Gradient backdrop */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-900/25 via-transparent to-black/60 pointer-events-none" />
              {/* Top bar */}
              <div className="relative flex items-center justify-between px-6 pt-6 pb-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 shadow-lg">
                    <Youtube className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">Elevate360Official</p>
                    <p className="text-white/40 text-xs">@Elevate360Official</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 bg-red-500/10 group-hover:bg-red-500/20 transition">
                  Subscribe
                </span>
              </div>
              {/* Content area */}
              <div className="relative px-6 py-10 flex flex-col items-center text-center gap-5">
                {/* Play button */}
                <div className="w-20 h-20 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl shadow-red-900/50 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-9 w-9 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="space-y-2 max-w-lg">
                  <p className="text-white font-semibold text-lg">Watch on YouTube</p>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Exclusive content, product showcases, app tutorials, and creator insights — straight from the Elevate360Official channel.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 transition text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-lg">
                  <Youtube className="h-4 w-4" />
                  {t("cta_view_channel")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </a>
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
              onClick={() => trackClick("app", "Bondedlove")}
              aria-label="Open Bondedlove web app"
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer reveal reveal-delay-1"
            >
              <div className="aspect-[4/3] w-full overflow-hidden lux-panel flex items-center justify-center p-8">
                <img
                  src={appBondedlove}
                  alt="Bondedlove relationship app interface by Elevate360Official"
                  loading="lazy"
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
                <div className="flex items-center gap-2 mt-auto flex-wrap">
                  <span className="btn-tertiary flex-1 justify-center">
                    Open app <ArrowRight className="h-4 w-4" />
                  </span>
                  <ScreenshotsButton images={APP_SCREENSHOTS["Bondedlove"]} appName="Bondedlove" />
                  <ShareButton
                    url="https://bondedlove.elevate360official.com"
                    title="Bondedlove — Dating App"
                    text="Check out Bondedlove, a dating app built for real connections by Elevate360!"
                  />
                </div>
              </div>
            </a>

            {/* Healthwisesupport */}
            <a
              href="https://health.elevate360official.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("app", "Healthwisesupport")}
              aria-label="Open Healthwisesupport web app"
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer reveal reveal-delay-2"
            >
              <div className="aspect-[4/3] w-full overflow-hidden lux-panel flex items-center justify-center p-8">
                <img
                  src={appHealthwise}
                  alt="Healthwisesupport wellness app interface by Elevate360Official"
                  loading="lazy"
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
                <div className="flex items-center gap-2 mt-auto flex-wrap">
                  <span className="btn-tertiary flex-1 justify-center">
                    Open app <ArrowRight className="h-4 w-4" />
                  </span>
                  <ScreenshotsButton images={APP_SCREENSHOTS["Healthwisesupport"]} appName="Healthwisesupport" />
                  <ShareButton
                    url="https://health.elevate360official.com"
                    title="Healthwisesupport — Wellness App"
                    text="Check out Healthwisesupport, your wellness companion app by Elevate360!"
                  />
                </div>
              </div>
            </a>

            {/* Video Crafter */}
            <a
              href="https://crafter.elevate360official.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("app", "Video Crafter")}
              aria-label="Open Video Crafter web app"
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer reveal reveal-delay-3"
            >
              <div className="aspect-[4/3] w-full overflow-hidden lux-panel flex items-center justify-center p-8">
                <img
                  src={appVideoCrafter}
                  alt="Video Crafter creative video production interface by Elevate360Official"
                  loading="lazy"
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
                <div className="flex items-center gap-2 mt-auto flex-wrap">
                  <span className="btn-tertiary flex-1 justify-center">
                    Open app <ArrowRight className="h-4 w-4" />
                  </span>
                  <ScreenshotsButton images={APP_SCREENSHOTS["Video Crafter"]} appName="Video Crafter" />
                  <ShareButton
                    url="https://crafter.elevate360official.com"
                    title="Video Crafter — Video Editor"
                    text="Check out Video Crafter, a professional video editing suite by Elevate360!"
                  />
                </div>
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
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://www.etsy.com/shop/Elevate360Official?sort_order=date_desc"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick("art", "Etsy Art Studio")}
                    data-testid="link-etsy-shop"
                    className="btn-primary shadow-lg hover:shadow-xl"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Visit Art Studio on Etsy
                  </a>
                  <button
                    onClick={() => setCommissionOpen(true)}
                    data-testid="button-open-commission"
                    className="btn-secondary"
                  >
                    <Palette className="h-5 w-5" />
                    Commission Custom Art
                  </button>
                </div>
              </div>

              <div className="w-full md:w-1/2 reveal-right">
                <img
                  src="/Elevate360Art_Studio_Presentation_1772460961759.png"
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
                    onClick={() => trackClick("music", "Audiomack")}
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
                  {/* Audiomack player card — replaces broken embed */}
                  <a
                    href="https://audiomack.com/elevate360music"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="iframe-audiomack-player"
                    className="group block overflow-hidden rounded-3xl border border-violet-500/20 shadow-2xl shadow-violet-900/30"
                    style={{ background: "linear-gradient(135deg, hsl(270 40% 8%) 0%, hsl(240 40% 10%) 100%)" }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "#FF5500" }}>
                          <Music className="h-4 w-4 text-white" />
                        </span>
                        <div>
                          <p className="text-white font-bold text-sm leading-tight">elevate360music</p>
                          <p className="text-white/40 text-xs">Audiomack</p>
                        </div>
                      </div>
                      <span className="text-xs text-white/50 group-hover:text-white/80 transition">Listen →</span>
                    </div>
                    {/* Visualizer bars */}
                    <div className="flex items-end justify-center gap-1 py-7 px-6">
                      {[40, 65, 85, 55, 90, 70, 45, 80, 60, 95, 50, 75, 88, 42, 68].map((h, i) => (
                        <div
                          key={i}
                          className="rounded-full opacity-80"
                          style={{
                            width: "6px",
                            height: `${h * 0.8}px`,
                            background: i % 3 === 0
                              ? "linear-gradient(to top, #7c3aed, #a78bfa)"
                              : i % 3 === 1
                              ? "linear-gradient(to top, #FF5500, #ff8f66)"
                              : "linear-gradient(to top, #6d28d9, #8b5cf6)",
                          }}
                        />
                      ))}
                    </div>
                    {/* Track list preview */}
                    <div className="px-5 pb-2 space-y-2">
                      {[
                        "Afrobeat Grooves",
                        "Amapiano Vibes",
                        "R&B & Neo-Soul",
                      ].map((track, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 border-t border-white/5">
                          <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-2.5 w-2.5 text-violet-300 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                          <span className="text-white/70 text-xs font-medium">{track}</span>
                          <span className="ml-auto text-white/25 text-xs">elevate360music</span>
                        </div>
                      ))}
                    </div>
                    {/* CTA */}
                    <div className="px-5 py-4">
                      <span className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition group-hover:opacity-90" style={{ background: "#FF5500" }}>
                        <Music className="h-4 w-4" />
                        Open on Audiomack
                      </span>
                    </div>
                  </a>
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
                  alt="Healthwise Stay Healthy book cover by Oladele Oyeniyi"
                  className="w-full h-auto rounded-xl shadow-xl transform translate-y-8 hover:-translate-y-2 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="space-y-4">
                  <img
                    src={bookTogether}
                    alt="Together Let There Be Love book cover by Oladele Oyeniyi"
                    className="w-full h-auto rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-500"
                    loading="lazy"
                  />
                  <img
                    src={bookOneCleanMeal}
                    alt="One Clean Meal A 7-Day Reset book cover by Oladele Oyeniyi"
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
                    alt="Featured Elevate360Official publication by Oladele Oyeniyi"
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
                    onClick={() => trackClick("book", "Healthwise: Stay Healthy")}
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
                  <ShareButton
                    url="https://www.amazon.com/dp/B0GMBNPZC9"
                    title="Healthwise: Stay Healthy"
                    text="Check out 'Healthwise: Stay Healthy' on Amazon — a guide to understanding your body by Oladele Oyeniyi!"
                  />
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
                    alt="Together Let There Be Love book cover by Oladele Oyeniyi"
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

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
                  <a
                    href="https://www.amazon.com/dp/B0G5DWG61V"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick("book", "Together: Let There Be Love")}
                    data-testid="link-buy-together"
                    className="btn-primary"
                  >
                    Buy on Amazon
                  </a>
                  <ShareButton
                    url="https://www.amazon.com/dp/B0G5DWG61V"
                    title="Together: Let There Be Love"
                    text="Check out 'Together: Let There Be Love' on Amazon — a relationship handbook for couples by Oladele Oyeniyi!"
                  />
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
                    alt="One Clean Meal A 7-Day Reset book cover by Oladele Oyeniyi"
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

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
                  <a
                    href="https://www.amazon.com/dp/B0FSDTPVJC"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick("book", "One Clean Meal")}
                    data-testid="link-buy-onecleanmeal"
                    className="btn-primary"
                  >
                    Buy on Amazon
                  </a>
                  <ShareButton
                    url="https://www.amazon.com/dp/B0FSDTPVJC"
                    title="One Clean Meal: A 7-Day Reset"
                    text="Check out 'One Clean Meal: A 7-Day Reset' on Amazon — simple habits for better health by Oladele Oyeniyi!"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Comparison Table */}
      <section className="py-20 border-t border-white/8" style={{ background: "hsl(220 50% 7%)" }}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12 reveal">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              Overview
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">{t("section_compare")}</h2>
            <p className="text-white/50 max-w-xl mx-auto">{t("section_compare_sub")}</p>
          </div>
          <div className="overflow-x-auto reveal">
            <table className="w-full text-sm" data-testid="table-product-comparison">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-white/40 font-medium w-40">Feature</th>
                  {[
                    { name: "Bondedlove", emoji: "💑", color: "#F4A62A" },
                    { name: "Healthwisesupport", emoji: "🩺", color: "#22c55e" },
                    { name: "Video Crafter", emoji: "🎬", color: "#38bdf8" },
                    { name: "KDP Books", emoji: "📚", color: "#a78bfa" },
                    { name: "Etsy Art", emoji: "🎨", color: "#fb923c" },
                    { name: "Music", emoji: "🎵", color: "#f472b6" },
                  ].map(p => (
                    <th key={p.name} className="py-4 px-4 text-center font-semibold" style={{ color: p.color }}>
                      <div className="text-xl mb-1">{p.emoji}</div>
                      <div className="text-xs">{p.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Free to use", vals: ["✓", "✓", "✓", "Kindle Unlim.", "—", "Free stream"] },
                  { feature: "Platform", vals: ["Web/iOS/Android", "Web/iOS/Android", "Web/iOS/Android", "Amazon", "Etsy", "Audiomack"] },
                  { feature: "Category", vals: ["Dating", "Health", "Video edit", "Books", "Digital art", "Music"] },
                  { feature: "In-app purchase", vals: ["Optional", "Optional", "Optional", "Purchase", "Purchase", "—"] },
                  { feature: "Rating", vals: ["4.8 ★", "4.9 ★", "4.7 ★", "4.8 ★", "5.0 ★", "—"] },
                  { feature: "Language", vals: ["Multi-lang", "Multi-lang", "Multi-lang", "English", "English", "Various"] },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                    <td className="py-3 px-4 text-white/50 font-medium">{row.feature}</td>
                    {row.vals.map((v, j) => (
                      <td key={j} className="py-3 px-4 text-center text-white/75">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Meet the Creator Section */}
      <section className="py-24 border-t border-white/10 relative overflow-hidden">
        {/* ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          {/* eyebrow */}
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">The Founder</p>
            <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">Meet Oladele Oyeniyi</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center max-w-5xl mx-auto">

            {/* Left — avatar + identity card */}
            <div className="flex flex-col items-center md:items-start gap-7 reveal-left">
              {/* Avatar */}
              <div className="relative">
                <div className="w-44 h-56 md:w-52 md:h-64 rounded-[2.5rem] overflow-hidden border-2 border-primary/40 shadow-[0_0_60px_rgba(244,166,42,0.2)] ring-4 ring-primary/10">
                  <img
                    src="/creator-photo.png"
                    alt="Oladele Oyeniyi — Elevate360Official"
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                {/* verified badge */}
                <div className="absolute -bottom-3 -right-3 bg-primary text-[#070b13] text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  ✦ Verified Creator
                </div>
              </div>

              {/* Role chips */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {["Entrepreneur", "Author", "App Developer", "Visual Artist", "Music Producer"].map((role) => (
                  <span key={role} className="badge-gold text-xs px-3 py-1">{role}</span>
                ))}
              </div>

              {/* Social row */}
              <div className="flex items-center gap-3">
                <a
                  href="https://www.instagram.com/officialelevate360/"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-creator-instagram"
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://www.youtube.com/@Elevate360Official"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-creator-youtube"
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://www.etsy.com/shop/Elevate360Official"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-creator-etsy"
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                  aria-label="Etsy"
                >
                  <Palette className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right — story + timeline */}
            <div className="space-y-8 reveal-right">
              <div className="space-y-4">
                <p className="text-lg md:text-xl text-foreground/90 leading-relaxed">
                  Oladele Oyeniyi is the creative force behind <span className="text-primary font-semibold">Elevate360Official</span> — a multi-disciplinary brand built on a single belief: that technology, words, and art can genuinely improve people's lives.
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  From building mobile apps that strengthen relationships and support wellness, to writing books that guide readers toward healthier bodies and stronger bonds — and crafting visual art that speaks where words can't — every Elevate360 product is designed with intention, not just ambition.
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  "Elevate the world, one product at a time." That's not a slogan — it's the operating principle behind everything we build.
                </p>
              </div>

              {/* Milestone timeline */}
              <div className="space-y-0 border-l-2 border-primary/30 pl-5">
                {[
                  { year: "2023", event: "Founded Elevate360Official and launched the first mobile app, Bondedlove." },
                  { year: "2024", event: "Published first Amazon KDP book. Opened the Elevate360 Art Studio on Etsy." },
                  { year: "2025", event: "Released two more apps — Healthwisesupport & Video Crafter. Published 2 additional books. Launched Audiomack music channel." },
                  { year: "2026", event: "Scaling the brand globally. 10,000+ users across all products and growing." },
                ].map(({ year, event }) => (
                  <div key={year} className="relative pb-7 last:pb-0">
                    <div className="absolute -left-[1.65rem] top-1 w-4 h-4 rounded-full bg-primary/30 border-2 border-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <p className="text-xs font-bold text-primary tracking-widest uppercase mb-1">{year}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{event}</p>
                  </div>
                ))}
              </div>

              {/* Mini stat row */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { n: "3", label: "Apps Built" },
                  { n: "3", label: "Books Published" },
                  { n: "10K+", label: "Lives Reached" },
                ].map(({ n, label }) => (
                  <div key={label} className="lux-card rounded-2xl p-4 text-center">
                    <p className="text-2xl font-heading font-extrabold text-primary">{n}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {(() => {
        const faqs = [
          {
            q: "What is Elevate360Official?",
            a: "Elevate360Official is a multi-disciplinary digital brand founded by Oladele Oyeniyi. It spans mobile apps, Amazon KDP books, original music on Audiomack, and a visual art studio on Etsy — all built around the mission of empowering lives through technology, creativity, and words.",
          },
          {
            q: "Who is behind the brand?",
            a: "The brand is founded and led by Oladele Oyeniyi — an entrepreneur, author, app developer, visual artist, and music producer. Every product under Elevate360 is personally crafted with intention and purpose.",
          },
          {
            q: "Are the mobile apps free to use?",
            a: "Yes, all three apps — Bondedlove, Healthwisesupport, and Video Crafter — are free to download and use. Some premium features may require an in-app upgrade.",
          },
          {
            q: "What platforms are the apps available on?",
            a: "The apps are available on both iOS (iPhone) and Android devices. Visit the app pages through the links on this site to download from the App Store or Google Play.",
          },
          {
            q: "Where can I buy Elevate360 books?",
            a: "All books are available on Amazon in both paperback and Kindle formats. Visit the Publications section above or search for the titles on Amazon — Healthwise: Stay Healthy, Together: Let There Be Love, and One Clean Meal.",
          },
          {
            q: "Are the books available as ebooks?",
            a: "Yes. All three titles are available as Kindle ebooks on Amazon, making them instantly accessible on any device. Paperback editions are also available for those who prefer a physical copy.",
          },
          {
            q: "Can I commission custom artwork?",
            a: "Absolutely! The Elevate360 Art Studio accepts commissions for custom digital art and prints. Visit the Etsy shop at elevate360official.com/links or use the contact form on this site to discuss your project.",
          },
          {
            q: "What art formats are available?",
            a: "Digital downloads and print-on-demand physical prints are both available through the Etsy shop. Custom sizes and formats can be arranged — reach out via the contact form to discuss your needs.",
          },
          {
            q: "Where can I listen to Elevate360 music?",
            a: "Elevate360 music is available on Audiomack under the name Elevate360Music. Visit the Music section above to open the Audiomack page directly, or search 'elevate360music' on Audiomack.",
          },
          {
            q: "How do I stay updated on new releases?",
            a: "Subscribe to the Elevate360 newsletter using the form at the bottom of this page. You'll be the first to know about new app features, book launches, music drops, and exclusive content.",
          },
        ];

        return (
          <FAQSection faqs={faqs} />
        );
      })()}

      {/* ── Offers / Buy Now ── */}
      {offers.length > 0 && (
        <section id="offers" className="py-20 border-t border-white/8" style={{ background: "hsl(220 50% 8%)" }}>
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12 reveal">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
                Digital Offers
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">Instant Access Products</h2>
              <p className="text-white/50 max-w-xl mx-auto">Pick an offer, pay securely via Stripe, and we'll deliver within the promised timeframe — no waiting, no gatekeeping.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 reveal">
              {offers.map((offer) => {
                const icon = offer.metadata?.icon ?? "✨";
                const isHighlight = offer.metadata?.highlight === "true";
                const deliveryDays = offer.metadata?.deliveryDays;
                const priceLabel = `$${(offer.amount / 100).toFixed(0)}`;
                const isBuying = buyingOffer === offer.priceId;

                return (
                  <div key={offer.priceId}
                    className="lux-card flex flex-col p-6 gap-4 hover:-translate-y-1 transition-transform duration-200 relative"
                    data-testid={`card-offer-${offer.productId}`}
                    style={isHighlight ? { borderColor: "rgba(244,166,42,0.4)" } : {}}>
                    {isHighlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: "#F4A62A", color: "#0d1a2e" }}>
                        Most Popular
                      </span>
                    )}
                    <div className="text-4xl">{icon}</div>
                    <div>
                      <h3 className="text-white font-heading font-bold text-lg leading-tight">{offer.name}</h3>
                      {deliveryDays && (
                        <p className="text-[11px] text-white/30 mt-0.5 uppercase tracking-wide">Delivered in {deliveryDays} day{deliveryDays !== "1" ? "s" : ""}</p>
                      )}
                    </div>
                    <p className="text-white/50 text-sm flex-1">{offer.description}</p>
                    <div className="flex items-end justify-between mt-auto pt-2">
                      <span className="text-2xl font-bold" style={{ color: "#F4A62A" }}>{priceLabel}</span>
                      <span className="text-white/30 text-xs">USD · one-time</span>
                    </div>
                    <button
                      data-testid={`btn-buy-${offer.productId}`}
                      onClick={() => handleBuyNow(offer.priceId, offer.name, offer.amount)}
                      disabled={isBuying}
                      className="btn-primary w-full mt-1 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                    >
                      {isBuying ? "Redirecting to Checkout…" : "Buy Now →"}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-white/25 text-xs mt-8">Secure payments powered by Stripe · All transactions encrypted</p>
          </div>
        </section>
      )}

      {/* ── Book a Session ── */}
      {consultations.length > 0 && (
        <section id="book-session" className="py-20 border-t border-white/8" style={{ background: "hsl(220 50% 7%)" }}>
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12 reveal">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
                Book a Session
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">Work 1-on-1 With Oladele</h2>
              <p className="text-white/50 max-w-xl mx-auto">Strategy, creativity, and execution — tailored to your goals. Choose a session type below and secure your spot.</p>
            </div>

            <ConsultationGrid
              consultations={consultations}
              onBook={(c) => { setBookingConsultation(c); setBookingSuccess(false); setBookingError(""); }}
            />
          </div>
        </section>
      )}

      {/* Booking Modal */}
      {bookingConsultation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setBookingConsultation(null); setBookingSuccess(false); } }}
        >
          <div className="lux-card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-heading font-bold text-white text-xl">{bookingConsultation.title}</h3>
                <p className="text-white/40 text-sm mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />{bookingConsultation.duration} min
                  &nbsp;·&nbsp;
                  <span style={{ color: "#F4A62A" }}>
                    {bookingConsultation.price === 0 ? "Free" : `$${(bookingConsultation.price / 100).toFixed(0)}`}
                  </span>
                </p>
              </div>
              <button data-testid="btn-close-booking-modal"
                onClick={() => { setBookingConsultation(null); setBookingSuccess(false); }}
                className="text-white/40 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: "#22c55e" }} />
                <h4 className="text-white font-heading font-bold text-lg mb-2">Booking Request Sent!</h4>
                <p className="text-white/50 text-sm">We'll confirm your session within 24 hours. Check your email for a confirmation.</p>
                <button data-testid="btn-booking-done"
                  onClick={() => { setBookingConsultation(null); setBookingSuccess(false); }}
                  className="btn-primary mt-6 px-8">Done</button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Your Name *</label>
                  <input data-testid="input-booking-name"
                    required value={bookingForm.name}
                    onChange={(e) => setBookingForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Email Address *</label>
                  <input data-testid="input-booking-email"
                    type="email" required value={bookingForm.email}
                    onChange={(e) => setBookingForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Preferred Date/Time</label>
                  <input data-testid="input-booking-date"
                    type="text" value={bookingForm.preferredDate}
                    onChange={(e) => setBookingForm(f => ({ ...f, preferredDate: e.target.value }))}
                    placeholder="e.g. Weekdays after 3pm EST"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Tell Us Your Goal</label>
                  <textarea data-testid="input-booking-message"
                    rows={3} value={bookingForm.message}
                    onChange={(e) => setBookingForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="What would you like to accomplish in this session?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#F4A62A]/50 resize-none" />
                </div>
                {bookingError && <p className="text-red-400 text-sm">{bookingError}</p>}
                <button data-testid="btn-submit-booking"
                  type="submit" disabled={bookingSubmitting}
                  className="btn-primary w-full mt-1 flex items-center justify-center gap-2">
                  {bookingSubmitting ? "Sending…" : <><Calendar className="w-4 h-4" /> Confirm Booking</>}
                </button>
                <p className="text-white/30 text-xs text-center">We'll email you within 24 hours to confirm the session.</p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Work With Me Section */}
      <section id="collaborate" className="py-20 border-t border-white/8" style={{ background: "linear-gradient(180deg, hsl(220 50% 8%) 0%, hsl(220 50% 6%) 100%)" }}>
        <div className="container mx-auto px-4 md:px-6">

          {/* Heading */}
          <div className="text-center mb-14 reveal">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              <Zap className="h-3 w-3" />
              Collaborate
            </span>
            <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight text-white mb-4">
              Let's Build Something<br className="hidden md:block" />{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">Together</span>
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Elevate360Official is open to meaningful partnerships across apps, music, books, and art.
              Whether you're a brand, creator, or organisation — let's create real impact.
            </p>
          </div>

          {/* Collaboration cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            {[
              {
                Icon: Handshake,
                color: "#F4A62A",
                bg: "rgba(244,166,42,0.08)",
                title: "Brand Partnerships",
                desc: "Reach an engaged global audience of wellness seekers, couples, creators, and book lovers across our apps, publications, and social channels.",
              },
              {
                Icon: Music,
                color: "#a78bfa",
                bg: "rgba(167,139,250,0.08)",
                title: "Music Features & Licensing",
                desc: "Collaborate on original tracks, license existing music for your projects, or co-create with Elevate360Music on upcoming releases.",
              },
              {
                Icon: Smartphone,
                color: "#38bdf8",
                bg: "rgba(56,189,248,0.08)",
                title: "App Development Consulting",
                desc: "Leverage hands-on experience building Bondedlove, Healthwisesupport, and Video Crafter to get strategic guidance on your own digital product.",
              },
              {
                Icon: Mic,
                color: "#22c55e",
                bg: "rgba(34,197,94,0.08)",
                title: "Media & Speaking",
                desc: "Book Oladele Oyeniyi for podcast interviews, blog features, panel discussions, or keynote talks on entrepreneurship, tech, and creative business.",
              },
            ].map(({ Icon, color, bg, title, desc }) => (
              <div
                key={title}
                className="lux-card reveal group hover:-translate-y-1 transition-transform duration-300"
                data-testid={`card-collaborate-${title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: bg, border: `1px solid ${color}30` }}
                  >
                    <Icon className="h-6 w-6" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-heading mb-2">{title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA strip */}
          <div className="text-center reveal">
            <p className="text-white/50 text-sm mb-5">
              All enquiries welcome — response within 48 hours.
            </p>
            <ContactDialog>
              <button
                data-testid="button-collaboration-cta"
                className="btn-primary text-base px-8 py-3 shadow-lg shadow-primary/20 hover:shadow-primary/40"
              >
                <Handshake className="h-5 w-5" />
                Start a Conversation
              </button>
            </ContactDialog>
          </div>

        </div>
      </section>

      {/* Testimonials Section */}
      {testimonialData.length > 0 && (() => {
        const PRODUCT_COLORS: Record<string, { bg: string; color: string }> = {
          Bondedlove:         { bg: "rgba(244,166,42,0.12)",  color: "#F4A62A" },
          Healthwisesupport:  { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
          "Video Crafter":    { bg: "rgba(56,189,248,0.12)",  color: "#38bdf8" },
          "Amazon KDP":       { bg: "rgba(251,146,60,0.12)",  color: "#fb923c" },
          Etsy:               { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
          Music:              { bg: "rgba(244,166,42,0.10)",  color: "#F4A62A" },
        };
        return (
          <section id="reviews" className="py-20 border-t border-white/8" style={{ background: "hsl(220 50% 7%)" }}>
            <div className="container mx-auto px-4 md:px-6">
              <div className="text-center mb-14 reveal">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
                  style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
                  <Star className="h-3 w-3 fill-primary" />
                  Reviews
                </span>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                  What People Are{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">Saying</span>
                </h2>
                <p className="text-white/50 max-w-xl mx-auto">Real feedback from real users across our apps, books, music, and art.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {testimonialData.map((t) => {
                  const style = PRODUCT_COLORS[t.product] ?? { bg: "rgba(244,166,42,0.10)", color: "#F4A62A" };
                  return (
                    <div
                      key={t.id}
                      className="lux-card reveal flex flex-col gap-4"
                      data-testid={`card-testimonial-${t.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < t.rating ? "text-primary fill-primary" : "text-white/15"}`} />
                          ))}
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>
                          {t.product}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed flex-1">"{t.body}"</p>
                      <div>
                        <p className="text-white font-bold text-sm">{t.name}</p>
                        {t.handle && <p className="text-white/40 text-xs mt-0.5">{t.handle}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

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
                  { href: "https://www.youtube.com/@Elevate360Official", Icon: Youtube, label: "YouTube", testid: "link-youtube" },
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
      <CommissionDialog open={commissionOpen} onClose={() => setCommissionOpen(false)} />
    </div>
  );
}
