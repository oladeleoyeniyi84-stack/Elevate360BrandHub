import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const PRE_FILLED_TEXT = encodeURIComponent(
  "Hi Elevate360! I visited your website and would love to connect. 👋"
);

export function WhatsAppButton() {
  const [number, setNumber] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    fetch("/api/config/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.whatsappNumber) setNumber(d.whatsappNumber);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!number) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [number]);

  if (!number || location === "/dashboard") return null;

  const href = `https://wa.me/${number.replace(/\D/g, "")}?text=${PRE_FILLED_TEXT}`;

  return (
    <div
      className={`fixed bottom-36 md:bottom-24 left-4 z-[150] flex items-center gap-3 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {/* Tooltip bubble */}
      {tooltip && (
        <div className="relative bg-[#075E54] text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
          Chat with us on WhatsApp
          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-[6px] border-t-transparent border-b-transparent border-l-[#075E54]" />
        </div>
      )}

      {/* Button */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="button-whatsapp"
        aria-label="Chat with us on WhatsApp"
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        onFocus={() => setTooltip(true)}
        onBlur={() => setTooltip(false)}
        className="w-14 h-14 rounded-full shadow-[0_4px_24px_rgba(37,211,102,0.4)] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
      >
        {/* WhatsApp SVG icon */}
        <svg
          viewBox="0 0 32 32"
          className="w-7 h-7 fill-white"
          aria-hidden="true"
        >
          <path d="M16.004 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.347.619 4.589 1.707 6.547L2.667 29.333l6.987-1.653A13.28 13.28 0 0 0 16.004 29.333C23.36 29.333 29.333 23.36 29.333 16S23.36 2.667 16.004 2.667zm0 24a10.627 10.627 0 0 1-5.44-1.493l-.389-.232-4.147.98 1.008-3.987-.254-.408A10.61 10.61 0 0 1 5.333 16c0-5.88 4.787-10.667 10.667-10.667S26.667 10.12 26.667 16 21.88 26.667 16.004 26.667zm5.853-7.987c-.32-.16-1.893-.933-2.187-1.04-.293-.107-.507-.16-.72.16-.213.32-.827 1.04-.987 1.253-.16.213-.32.24-.627.08-.32-.16-1.333-.493-2.56-1.573-.947-.84-1.587-1.88-1.773-2.2-.187-.32-.02-.493.14-.653.147-.147.32-.387.48-.573.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.733-.987-2.373-.253-.613-.52-.533-.72-.547h-.613c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.667s1.147 3.093 1.307 3.307c.16.213 2.267 3.467 5.493 4.853.773.333 1.373.533 1.84.68.773.24 1.48.213 2.04.133.627-.093 1.893-.773 2.16-1.52.267-.747.267-1.387.187-1.52-.08-.133-.28-.213-.6-.373z" />
        </svg>
      </a>
    </div>
  );
}
