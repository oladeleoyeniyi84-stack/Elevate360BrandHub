// Phase 72.4R — shared primitives for the Search Intelligence console.
// Extracted from the original 72.4 page so every tab speaks one visual
// language (gold-on-navy founder dashboard style).

export const GOLD = "#F4A62A";
export const BG = "hsl(220 50% 8%)";

export const SOURCE_LABELS: Record<string, string> = {
  google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo", yahoo: "Yahoo",
  yandex: "Yandex", other_search: "Other search", ai_assistant: "AI assistants",
  social: "Social", email: "Email", paid: "Paid", referral: "Referral", direct: "Direct",
};

export const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
export const fmtUsd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
export const fmtNum = (v: number) => v.toLocaleString();
export const fmtPos = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toFixed(1));
export const fmtVital = (metric: string, v: number | null) =>
  v === null ? "—" : metric === "cls" ? v.toFixed(3) : `${Math.round(v).toLocaleString()}ms`;

export function DeltaText({ value }: { value: number }) {
  const cls = value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-white/40";
  return <span className={cls}>{value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString()}</span>;
}

export function Stat({ icon: Icon, label, value, testId, sub }: {
  icon: any; label: string; value: string | number; testId: string; sub?: React.ReactNode;
}) {
  return (
    <div className="lux-card">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><Icon className="h-4 w-4 text-[#F4A62A]" /> {label}</div>
      <p className="text-2xl font-black text-white mt-2" data-testid={testId}>{value}</p>
      {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export function TopList({ title, icon: Icon, items, emptyText }: {
  title: string; icon: any; items: { name: string; count: number }[]; emptyText: string;
}) {
  return (
    <div className="lux-card">
      <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><Icon className="h-4 w-4 text-[#F4A62A]" /> {title}</div>
      {items.length === 0 ? (
        <p className="text-white/35 text-sm">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-sm" data-testid={`row-${title.toLowerCase().replace(/\s+/g, "-")}-${i}`}>
              <span className="text-white/75 truncate mr-3">{item.name}</span>
              <span className="text-white font-bold">{item.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionCard({ title, icon: Icon, subtitle, children, testId }: {
  title: string; icon?: any; subtitle?: string; children: React.ReactNode; testId?: string;
}) {
  return (
    <div className="lux-card" data-testid={testId}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 text-[#F4A62A]" />}
        <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      {subtitle && <p className="text-white/35 text-xs mb-2">{subtitle}</p>}
      {children}
    </div>
  );
}

export function EmptyCard({ title, message, testId }: { title: string; message: string; testId?: string }) {
  return (
    <div className="lux-card" data-testid={testId}>
      <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-2">{title}</h2>
      <p className="text-white/40 text-sm leading-relaxed">{message}</p>
    </div>
  );
}

export function SeverityPill({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    low: "bg-white/5 text-white/50 border-white/10",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${styles[severity] ?? styles.low}`}>
      {severity}
    </span>
  );
}

export function RatingPill({ rating }: { rating: string | null }) {
  if (rating === null) return <span className="text-white/30 text-xs">—</span>;
  const styles: Record<string, string> = {
    pass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    needs_improvement: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    fail: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<string, string> = { pass: "Pass", needs_improvement: "Needs work", fail: "Fail" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${styles[rating] ?? ""}`}>
      {labels[rating] ?? rating}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    partial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
    running: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    not_configured: "bg-white/5 text-white/45 border-white/10",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${styles[status] ?? styles.not_configured}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function OkBadge({ ok, yes = "OK", no = "Issue" }: { ok: boolean; yes?: string; no?: string }) {
  return ok
    ? <span className="text-emerald-400 text-xs font-bold">{yes}</span>
    : <span className="text-red-400 text-xs font-bold">{no}</span>;
}
