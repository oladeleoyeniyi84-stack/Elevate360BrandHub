import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Home, Smartphone, BookOpen, Music, Palette, MessageCircle } from "lucide-react";

const TABS = [
  { id: "top",       label: "Home",  Icon: Home,       href: "#top",        scrollTop: true },
  { id: "apps",      label: "Apps",  Icon: Smartphone, href: "#apps",       scrollTop: false },
  { id: "books",     label: "Books", Icon: BookOpen,   href: "#books",      scrollTop: false },
  { id: "music",     label: "Music", Icon: Music,      href: "#music",      scrollTop: false },
  { id: "art-studio",label: "Art",   Icon: Palette,    href: "#art-studio", scrollTop: false },
  { id: "ai",        label: "AI",    Icon: MessageCircle, href: "#ai-concierge-dialog", scrollTop: false },
] as const;

const SECTION_IDS = ["apps", "books", "music", "art-studio"] as const;

export function MobileBottomNav() {
  const [location] = useLocation();
  const [activeId, setActiveId] = useState<string>("top");
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isHome = location === "/";

  // Signal presence of the bottom nav so floating controls and page padding
  // can position themselves above it (see index.css: e360-float / pb-mobile-nav)
  useEffect(() => {
    if (isHome) {
      document.body.dataset.bottomNav = "true";
    } else {
      delete document.body.dataset.bottomNav;
    }
    return () => {
      delete document.body.dataset.bottomNav;
    };
  }, [isHome]);

  // Measure the real mobile bar (including iOS home-indicator safe area).
  // A fixed 72px assumption can leave content and floating controls underneath it.
  useEffect(() => {
    if (!isHome || !navRef.current) return;
    const nav = navRef.current;
    const syncHeight = () => {
      document.documentElement.style.setProperty("--bottom-nav-h", `${Math.ceil(nav.getBoundingClientRect().height)}px`);
    };
    syncHeight();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncHeight);
    observer?.observe(nav);
    window.addEventListener("resize", syncHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncHeight);
      document.documentElement.style.removeProperty("--bottom-nav-h");
    };
  }, [isHome]);

  // Follow the sitewide Concierge dialog state when it opens from any CTA.
  useEffect(() => {
    const handleState = (event: Event) => {
      setConciergeOpen((event as CustomEvent<{ open: boolean }>).detail?.open === true);
    };
    window.addEventListener("e360:concierge-state", handleState);
    return () => window.removeEventListener("e360:concierge-state", handleState);
  }, []);

  // Highlight only the section actually at the middle of the visible page.
  // This prevents a stale "Apps" highlight while visitors read Founder content.
  useEffect(() => {
    setActiveId("top");
    if (location !== "/") return;

    let frame = 0;
    const updateActive = () => {
      const probeY = window.innerHeight * 0.46;
      const visible = SECTION_IDS.find((id) => {
        const section = document.getElementById(id);
        if (!section) return false;
        const rect = section.getBoundingClientRect();
        return rect.top <= probeY && rect.bottom > probeY;
      });
      setActiveId(visible ?? "top");
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActive();
      });
    };
    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location]);

  // Only show on the home page
  if (!isHome) return null;

  const handleTap = (tab: typeof TABS[number]) => {
    if (tab.id === "ai") {
      window.dispatchEvent(new Event("e360:toggle-concierge"));
      return;
    }
    if (tab.scrollTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(tab.id);
    if (el) {
      // Account for the sticky header so the section heading stays visible.
      const header = document.querySelector('[data-testid="homepage-header"]');
      const headerHeight = header?.getBoundingClientRect().height ?? 88;
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerHeight - 12);
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-[100] md:hidden safe-bottom e360-drawer-hide transition-opacity duration-200"
      aria-label="Mobile section navigation"
      data-testid="mobile-bottom-nav"
    >
      {/* Frosted glass bar */}
      <div
        className="flex items-stretch border-t border-white/10"
        style={{
          background: "rgba(7, 11, 19, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === "ai" ? conciergeOpen : isHome && activeId === tab.id && !conciergeOpen;
          return (
            <button
              key={tab.id}
              onClick={() => handleTap(tab)}
              data-testid={`bottom-nav-${tab.id}`}
              aria-label={tab.id === "ai" ? (conciergeOpen ? "Close AI Concierge" : "Open AI Concierge") : tab.label}
              aria-current={tab.id !== "ai" && isActive ? "page" : undefined}
              aria-expanded={tab.id === "ai" ? conciergeOpen : undefined}
              aria-controls={tab.id === "ai" ? "ai-concierge-dialog" : undefined}
              className="relative flex-1 min-h-14 flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200 active:scale-90"
            >
              <div
                className={`transition-all duration-200 ${isActive ? "scale-110" : "scale-100"}`}
              >
                <tab.Icon
                  className="w-5 h-5 transition-colors duration-200"
                  style={{ color: isActive ? "#F4A62A" : "rgba(255,255,255,0.72)" }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide transition-colors duration-200"
                style={{ color: isActive ? "#F4A62A" : "rgba(255,255,255,0.72)" }}
              >
                {tab.label}
              </span>
              {/* Active dot */}
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
