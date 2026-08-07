import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Home, Smartphone, BookOpen, Music, Palette } from "lucide-react";

const TABS = [
  { id: "top",       label: "Home",  Icon: Home,       href: "#top",        scrollTop: true },
  { id: "apps",      label: "Apps",  Icon: Smartphone, href: "#apps",       scrollTop: false },
  { id: "books",     label: "Books", Icon: BookOpen,   href: "#books",      scrollTop: false },
  { id: "music",     label: "Music", Icon: Music,      href: "#music",      scrollTop: false },
  { id: "art-studio",label: "Art",   Icon: Palette,    href: "#art-studio", scrollTop: false },
] as const;

const SECTION_IDS = ["apps", "books", "music", "art-studio"] as const;

export function MobileBottomNav() {
  const [location] = useLocation();
  const [activeId, setActiveId] = useState<string>("top");

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

  // Track active section via IntersectionObserver — only ever on "/"
  useEffect(() => {
    // Derive active state strictly from the current pathname:
    // any non-home route resets to "top" and never highlights a section tab.
    setActiveId("top");
    if (location !== "/") return;

    const observers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    // Reset to "top" when near the top
    const onScroll = () => {
      if (window.scrollY < 200) setActiveId("top");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener("scroll", onScroll);
    };
  }, [location]);

  // Only show on the home page
  if (!isHome) return null;

  const handleTap = (tab: typeof TABS[number]) => {
    if (tab.scrollTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(tab.id);
    if (el) {
      const offset = 72; // nav height
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <nav
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
          const isActive = isHome && activeId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTap(tab)}
              data-testid={`bottom-nav-${tab.id}`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200 active:scale-90"
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
