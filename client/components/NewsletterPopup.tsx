import { useState, useEffect, useCallback } from "react";
import { X, Mail, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

const STORAGE_KEY = "e360_popup_dismissed";
const SCROLL_THRESHOLD = 0.6;
const DELAY_AFTER_SCROLL_MS = 800;

export function NewsletterPopup() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — must stay empty
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isDismissed = useCallback(() => {
    try {
      return !!sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {/* ignore */}
    setVisible(false);
  }, []);

  useEffect(() => {
    if (location !== "/" || isDismissed()) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;

    const onScroll = () => {
      if (fired) return;
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled >= SCROLL_THRESHOLD) {
        fired = true;
        timer = setTimeout(() => setVisible(true), DELAY_AFTER_SCROLL_MS);
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [location, isDismissed]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  const mutation = useMutation({
    mutationFn: async (data: { email: string; website: string }) => {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Something went wrong");
      return json;
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => dismiss(), 2200);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (email) mutation.mutate({ email, website });
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Newsletter signup"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={dismiss}
        data-testid="popup-backdrop"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-3xl lux-card p-8 shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-300">
        {/* Close */}
        <button
          onClick={dismiss}
          data-testid="button-close-popup"
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/30 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {!success ? (
          <>
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>

            {/* Copy */}
            <h2 className="text-2xl font-heading font-bold tracking-tight mb-2">
              Stay in the Elevate360 Loop
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Get first access to new app features, book drops, music releases, and exclusive content — straight to your inbox.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Honeypot — hidden from real users, bots fill it automatically */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
              />
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  data-testid="input-popup-email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs" data-testid="popup-error">{error}</p>
              )}

              <button
                type="submit"
                data-testid="button-popup-subscribe"
                disabled={mutation.isPending}
                className="btn-primary w-full justify-center py-3 text-sm"
              >
                {mutation.isPending ? "Subscribing…" : "Subscribe — It's Free"}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              No spam, ever. Unsubscribe any time.
            </p>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-heading font-bold">You're in!</h2>
            <p className="text-muted-foreground text-sm">
              Welcome to the Elevate360 community. Watch your inbox — great things are coming.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
