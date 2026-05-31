// Phase 68A — call-to-action banner prompting an upgrade (e.g. out of credits).
import { Link } from "wouter";
import { Sparkles } from "lucide-react";

const GOLD = "#F4A62A";

export function UpgradeBanner({
  title = "You're out of AI credits",
  message = "Upgrade your plan to keep chatting with the AI Concierge.",
  ctaText = "View plans",
}: {
  title?: string;
  message?: string;
  ctaText?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-3"
      style={{ borderColor: `${GOLD}55`, background: `${GOLD}11` }}
      data-testid="banner-upgrade"
    >
      <Sparkles className="h-5 w-5 shrink-0 mt-0.5" style={{ color: GOLD }} />
      <div className="flex-1">
        <p className="font-semibold text-white text-sm" data-testid="text-upgrade-title">{title}</p>
        <p className="text-white/60 text-xs mt-0.5">{message}</p>
        <Link
          href="/pricing"
          className="inline-block mt-2 text-xs font-semibold rounded-lg px-3 py-1.5"
          style={{ background: GOLD, color: "#0a1124" }}
          data-testid="link-upgrade-pricing"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}
