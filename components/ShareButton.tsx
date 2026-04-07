import { useState, useEffect, useRef } from "react";
import { Share2, Link2, Check } from "lucide-react";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
}

export function ShareButton({ url, title, text, className = "" }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const shareText = text || `Check out ${title} by Elevate360Official`;

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Native share on mobile / Chromium
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: shareText, url });
      } catch {
        // user dismissed — no-op
      }
      return;
    }

    // Desktop fallback — toggle dropdown
    setOpen((v) => !v);
  }

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function doWhatsApp(e: React.MouseEvent) {
    stop(e);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
      "_blank"
    );
    setOpen(false);
  }

  function doTwitter(e: React.MouseEvent) {
    stop(e);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
    setOpen(false);
  }

  function doCopy(e: React.MouseEvent) {
    stop(e);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1800);
    });
  }

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger button */}
      <button
        onClick={handleClick}
        aria-label="Share"
        data-testid={`button-share-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border border-white/15 text-muted-foreground hover:text-foreground hover:border-white/30 hover:bg-white/5 transition-all duration-150"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 w-44 bg-[#0d1a2e] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={doWhatsApp}
            data-testid={`button-share-whatsapp-${title.toLowerCase().replace(/\s+/g, "-")}`}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors"
          >
            <span className="text-base">💬</span> WhatsApp
          </button>
          <button
            onClick={doTwitter}
            data-testid={`button-share-twitter-${title.toLowerCase().replace(/\s+/g, "-")}`}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors border-t border-white/6"
          >
            <span className="text-base">𝕏</span> X / Twitter
          </button>
          <button
            onClick={doCopy}
            data-testid={`button-share-copy-${title.toLowerCase().replace(/\s+/g, "-")}`}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors border-t border-white/6"
          >
            {copied ? (
              <><Check className="h-4 w-4 text-green-400" /><span className="text-green-400">Copied!</span></>
            ) : (
              <><Link2 className="h-4 w-4" /> Copy Link</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
