import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollUtilities() {
  const [scrollPct, setScrollPct] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(total > 0 ? (scrolled / total) * 100 : 0);
      setShowTop(scrolled > 420);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  }

  return (
    <>
      {/* Reading progress bar — thin gold line at very top of viewport */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 z-[60] h-[3px] bg-gradient-to-r from-primary via-[#ffe3a6] to-primary transition-all duration-75 ease-linear"
        style={{ width: `${scrollPct}%` }}
      />

      {/* Back-to-top button */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        data-testid="button-back-to-top"
        className={`
          fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50
          w-11 h-11 rounded-full
          bg-primary text-[#0d1a2e]
          flex items-center justify-center
          shadow-lg shadow-primary/30
          transition-all duration-300 ease-out
          hover:scale-110 hover:bg-[#ffb84d] hover:shadow-primary/50
          active:scale-95
          ${showTop ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}
        `}
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </>
  );
}
