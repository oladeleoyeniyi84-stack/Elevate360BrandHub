import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { X, Megaphone } from "lucide-react";

interface PublicConfig {
  announcementText: string | null;
  announcementUrl: string | null;
}

export function AnnouncementBanner() {
  const [location] = useLocation();
  const [config, setConfig] = useState<PublicConfig>({ announcementText: null, announcementUrl: null });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/config/public")
      .then((r) => r.json())
      .then((data: PublicConfig) => {
        setConfig(data);
        // Restore dismissed state keyed by announcement text
        if (data.announcementText) {
          const key = `announcement_dismissed_${btoa(data.announcementText).slice(0, 16)}`;
          setDismissed(sessionStorage.getItem(key) === "1");
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (config.announcementText) {
      const key = `announcement_dismissed_${btoa(config.announcementText).slice(0, 16)}`;
      sessionStorage.setItem(key, "1");
    }
    setDismissed(true);
  };

  // Only show on home page, when there's text, and when not dismissed
  if (location !== "/" || !config.announcementText || dismissed) return null;

  const Inner = (
    <span className="flex items-center gap-2 text-sm font-semibold text-[#0d1a2e] leading-snug">
      <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{config.announcementText}</span>
      {config.announcementUrl && (
        <span className="underline underline-offset-2 opacity-80 font-bold whitespace-nowrap">
          Learn more →
        </span>
      )}
    </span>
  );

  return (
    <div
      role="banner"
      aria-live="polite"
      data-testid="announcement-banner"
      className="fixed top-16 left-0 right-0 z-[49] flex items-center justify-between gap-3 px-4 py-2.5 shadow-md"
      style={{
        background: "linear-gradient(90deg, #F4A62A 0%, #ffcc6e 50%, #F4A62A 100%)",
      }}
    >
      <div className="flex-1 flex justify-center">
        {config.announcementUrl ? (
          <a
            href={config.announcementUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="announcement-link"
            className="hover:opacity-80 transition-opacity"
          >
            {Inner}
          </a>
        ) : (
          <div>{Inner}</div>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        data-testid="announcement-dismiss"
        className="shrink-0 text-[#0d1a2e] opacity-60 hover:opacity-100 transition-opacity rounded-full hover:bg-black/10 p-1"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
