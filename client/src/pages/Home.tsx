import { useState, useEffect } from "react";
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

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
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

      {/* Apps Section */}
      <section id="apps" className="py-20 bg-background border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
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
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer"
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
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer"
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
              className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-[2px] h-full flex flex-col cursor-pointer"
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
              <div className="w-full md:w-1/2 space-y-6">
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

              <div className="w-full md:w-1/2">
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
              <div className="w-full md:w-1/2 space-y-6">
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

              <div className="w-full md:w-1/2 flex justify-center">
                <div className="relative w-full max-w-md">
                  <div className="lux-card rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center">
                        <Music className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold font-heading">Elevate360 Music</h3>
                        <p className="text-sm text-muted-foreground">@elevate360music</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        { title: "Amapiano Groove", artist: "weareelevate360" },
                        { title: "Elevate360AfroBeatVibeTrack", artist: "Elevate360" },
                      ].map((track, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/30 to-primary/30 flex items-center justify-center flex-shrink-0">
                            <Music className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{track.title}</p>
                            <p className="text-xs text-muted-foreground">{track.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Top Tracks on Audiomack
                    </p>
                  </div>
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
            <div className="w-full md:w-1/2 space-y-8">
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

            <div className="w-full md:w-1/2 relative">
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
          <div className="lux-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
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
          <div className="lux-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
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
          <div className="lux-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
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
          <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight mb-6 text-white">
            Ready to Elevate Your Experience?
          </h2>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
            Subscribe to stay updated on new apps, book releases, and exclusive content from Elevate360.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-16 mt-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex flex-col items-center md:items-start text-center md:text-left w-full md:w-1/3">
              <div className="flex items-center w-full max-w-[300px] md:max-w-[450px] mb-6">
                <img
                  src={brandLogo}
                  alt="Elevate360"
                  className="w-full h-auto object-contain scale-110 origin-left"
                />
              </div>
              <p className="text-muted-foreground text-sm mt-4">
                © {new Date().getFullYear()} Elevate360. All rights reserved.
              </p>
            </div>

            <div className="flex items-center space-x-6">
              <a
                href="https://www.instagram.com/officialelevate360/"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-instagram"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </a>

              <a
                href="https://www.youtube.com/channel/UCDGnUhgvM__6Mw8q26H-urQ"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-youtube"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <Youtube className="h-5 w-5" />
                <span className="sr-only">YouTube</span>
              </a>

              <a
                href="https://www.etsy.com/shop/Elevate360Official?sort_order=date_desc"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-etsy"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <Palette className="h-5 w-5" />
                <span className="sr-only">Etsy</span>
              </a>

              <a
                href="https://audiomack.com/elevate360music"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-audiomack-footer"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <Music className="h-5 w-5" />
                <span className="sr-only">Audiomack</span>
              </a>

              <ContactDialog>
                <button data-testid="button-footer-contact" className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  Contact
                </button>
              </ContactDialog>
            </div>
          </div>
        </div>
      </footer>

      <AIConcierge />
    </div>
  );
}
