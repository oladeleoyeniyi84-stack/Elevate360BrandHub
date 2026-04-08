import { Link } from "wouter";
import { Home, ArrowRight, Smartphone, BookOpen, Music, Palette } from "lucide-react";
import SEO from "@/components/SEO";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const quickLinks = [
  { href: "/#apps", label: "Mobile Apps", Icon: Smartphone },
  { href: "/#books", label: "Publications", Icon: BookOpen },
  { href: "/#music", label: "Music", Icon: Music },
  { href: "/#art-studio", label: "Art Studio", Icon: Palette },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d1a2e] text-foreground font-sans flex flex-col">
      <SEO
        title="Page Not Found | Elevate360Official"
        description="The page you are looking for could not be found. Explore Elevate360Official — apps, books, music, and art."
        path="/404"
      />
      {/* Ambient glow */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/6">
        <Link href="/">
          <img src={brandLogo} alt="Elevate360" className="h-11 w-auto object-contain cursor-pointer" />
        </Link>
        <Link href="/">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Home className="h-4 w-4" /> Home
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">

        {/* 404 number */}
        <p className="text-[10rem] md:text-[14rem] font-heading font-extrabold leading-none select-none
          text-transparent bg-clip-text bg-gradient-to-b from-primary via-[#ffe3a6] to-primary/30"
          aria-hidden="true"
        >
          404
        </p>

        <div className="-mt-4 md:-mt-8 space-y-4 max-w-lg">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
            This page doesn't exist
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            The page you're looking for may have been moved, renamed, or never existed.
            But there's plenty to explore at Elevate360.
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
          <Link href="/">
            <a
              data-testid="button-404-home"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-[#0d1a2e] font-bold text-sm hover:bg-[#ffb84d] transition-colors"
            >
              <Home className="h-4 w-4" />
              Go to Homepage
            </a>
          </Link>
          <Link href="/links">
            <a
              data-testid="button-404-links"
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-muted-foreground font-semibold text-sm hover:text-foreground hover:border-white/30 transition-colors"
            >
              All Links
              <ArrowRight className="h-4 w-4" />
            </a>
          </Link>
        </div>

        {/* Quick nav */}
        <div className="mt-14 w-full max-w-sm">
          <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground/60 uppercase mb-4">
            Or explore
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                data-testid={`link-404-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                {label}
              </a>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-white/6">
        <p className="text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} Elevate360Official · Oladele Oyeniyi
        </p>
      </footer>
    </div>
  );
}
