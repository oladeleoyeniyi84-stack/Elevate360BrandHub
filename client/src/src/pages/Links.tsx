import { useState } from "react";
import { ExternalLink, Instagram, Youtube, Palette, Music, Heart, Smartphone } from "lucide-react";
import SEO from "@/components/SEO";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ContactDialog } from "@/components/ContactDialog";

interface LinkCardProps {
  href: string;
  emoji: string;
  label: string;
  sublabel?: string;
  highlight?: boolean;
  delay?: string;
}

function LinkCard({ href, emoji, label, sublabel, highlight, delay = "0ms" }: LinkCardProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`link-bio-${label.toLowerCase().replace(/\s+/g, "-")}`}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{ transitionDelay: delay }}
      className={`
        group flex items-center gap-4 w-full px-5 py-4 rounded-2xl border transition-all duration-200
        ${highlight
          ? "bg-[#F4A62A] border-[#F4A62A] text-[#0d1a2e] hover:bg-[#ffb84d] hover:border-[#ffb84d]"
          : "bg-white/5 border-white/10 text-foreground hover:bg-white/10 hover:border-white/20"
        }
        ${pressed ? "scale-[0.97]" : "scale-100"}
      `}
    >
      <span className="text-2xl flex-shrink-0 w-8 text-center">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm leading-tight ${highlight ? "text-[#0d1a2e]" : "text-foreground"}`}>
          {label}
        </p>
        {sublabel && (
          <p className={`text-xs mt-0.5 truncate ${highlight ? "text-[#0d1a2e]/70" : "text-muted-foreground"}`}>
            {sublabel}
          </p>
        )}
      </div>
      <ExternalLink className={`h-4 w-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${highlight ? "text-[#0d1a2e]" : ""}`} />
    </a>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase px-1 pt-2 pb-0.5">
      {children}
    </p>
  );
}

export default function Links() {
  return (
    <div className="min-h-screen bg-[#0d1a2e] text-foreground font-sans flex flex-col items-center justify-start px-4 py-10 pb-16">
      <SEO
        title="Links | Elevate360Official"
        description="Explore all official Elevate360Official links — apps, books, music, art, and brand channels by Oladele Oyeniyi."
        path="/links"
      />
      <div className="w-full max-w-[440px] flex flex-col items-center gap-6">

        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={brandLogo}
            alt="Elevate360Official"
            className="h-20 w-auto object-contain"
          />
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground">Oladele Oyeniyi</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
              Apps · Books · Music · Art · Elevating lives through technology &amp; creativity.
            </p>
          </div>

          {/* Social row */}
          <div className="flex items-center gap-4 pt-1">
            {[
              { href: "https://www.instagram.com/officialelevate360/", Icon: Instagram, label: "Instagram" },
              { href: "https://www.youtube.com/@Elevate360Official", Icon: Youtube, label: "YouTube" },
              { href: "https://audiomack.com/elevate360music", Icon: Music, label: "Audiomack" },
              { href: "https://www.etsy.com/shop/Elevate360Official", Icon: Palette, label: "Etsy" },
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                data-testid={`link-bio-social-${label.toLowerCase()}`}
                className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-white/8" />

        {/* Links */}
        <div className="w-full flex flex-col gap-2">

          {/* Website */}
          <LinkCard
            href="https://www.elevate360official.com"
            emoji="🌐"
            label="Visit Our Full Website"
            sublabel="elevate360official.com"
            highlight
          />

          {/* Apps */}
          <SectionLabel>Mobile Apps</SectionLabel>
          <LinkCard
            href="https://bondedlove.elevate360official.com"
            emoji="❤️"
            label="Bondedlove"
            sublabel="Dating app built for real connections"
          />
          <LinkCard
            href="https://health.elevate360official.com"
            emoji="💚"
            label="Healthwisesupport"
            sublabel="Your wellness companion app"
          />
          <LinkCard
            href="https://crafter.elevate360official.com"
            emoji="🎬"
            label="Video Crafter"
            sublabel="Professional video editing suite"
          />

          {/* Books */}
          <SectionLabel>Books on Amazon</SectionLabel>
          <LinkCard
            href="https://www.amazon.com/dp/B0GMBNPZC9"
            emoji="📗"
            label="Healthwise: Stay Healthy"
            sublabel="Understand your body & protect your health"
          />
          <LinkCard
            href="https://www.amazon.com/dp/B0G5DWG61V"
            emoji="❤️"
            label="Together: Let There Be Love"
            sublabel="A relationship handbook for couples"
          />
          <LinkCard
            href="https://www.amazon.com/dp/B0FSDTPVJC"
            emoji="🥗"
            label="One Clean Meal: A 7-Day Reset"
            sublabel="Simple habits for better health & energy"
          />
          <LinkCard
            href="https://www.amazon.com/stores/Oladele-Oyeniyi/author/B0GCMSCWPV"
            emoji="📚"
            label="All Books — Amazon Author Page"
            sublabel="Browse the full Elevate360 collection"
          />

          {/* Music */}
          <SectionLabel>Music</SectionLabel>
          <LinkCard
            href="https://audiomack.com/elevate360music"
            emoji="🎵"
            label="Elevate360 Music on Audiomack"
            sublabel="Afrobeat · Amapiano · R&B · Hip-Hop"
          />

          {/* Art */}
          <SectionLabel>Art</SectionLabel>
          <LinkCard
            href="https://www.etsy.com/shop/Elevate360Official"
            emoji="🎨"
            label="Art Studio on Etsy"
            sublabel="Original digital art & creative prints"
          />

          {/* Connect */}
          <SectionLabel>Connect</SectionLabel>
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Stay in the Loop</p>
            <p className="text-xs text-muted-foreground mb-4">New apps, book drops, music &amp; exclusive content.</p>
            <NewsletterForm compact />
          </div>

          <ContactDialog>
            <button
              data-testid="button-bio-contact"
              className="flex items-center justify-center gap-3 w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-sm font-semibold"
            >
              <Heart className="h-4 w-4 text-primary" />
              Get in Touch
            </button>
          </ContactDialog>
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Elevate360Official ·{" "}
            <a href="https://www.elevate360official.com" className="hover:text-primary transition-colors">
              elevate360official.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
