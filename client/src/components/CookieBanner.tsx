import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "elevate360_cookie_consent";
const GA_ID = "G-5N80T0FN54";

function setGAOptOut(disabled: boolean) {
  // GA4 opt-out flag — must be set before any GA calls
  (window as any)[`ga-disable-${GA_ID}`] = disabled;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(t);
    }
    if (stored === "declined") {
      setGAOptOut(true);
    }
  }, []);

  function dismiss(withAnimation = true) {
    if (withAnimation) {
      setHiding(true);
      setTimeout(() => setVisible(false), 300);
    } else {
      setVisible(false);
    }
  }

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setGAOptOut(false);
    dismiss();
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setGAOptOut(true);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      data-testid="cookie-banner"
      className={`
        fixed z-50 transition-all duration-300 ease-out
        bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:max-w-sm
        ${hiding ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}
      `}
    >
      <div className="bg-[#0d1a2e] border border-white/12 md:rounded-2xl shadow-2xl shadow-black/50 px-5 py-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cookie className="h-4 w-4 text-[#F4A62A] flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-foreground">We use cookies</p>
          </div>
          <button
            onClick={() => decline()}
            aria-label="Close cookie banner"
            data-testid="button-cookie-close"
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 -mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          We use cookies to analyse traffic and improve your experience on Elevate360Official.
          You can decline to opt out of analytics at any time.
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={accept}
            data-testid="button-cookie-accept"
            className="flex-1 py-2 px-4 rounded-full bg-[#F4A62A] text-[#0d1a2e] text-xs font-bold hover:bg-[#ffb84d] transition-colors"
          >
            Accept All
          </button>
          <button
            onClick={decline}
            data-testid="button-cookie-decline"
            className="flex-1 py-2 px-4 rounded-full border border-white/20 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-white/40 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
