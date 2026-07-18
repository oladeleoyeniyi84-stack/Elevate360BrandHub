// Phase 72.2 — Founder-only Strategy Session funnel analytics dashboard.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Filter, Eye, EyeOff, Loader2, RefreshCw, TrendingDown, Clock, Users,
  ArrowDown, Megaphone, Globe, Layers,
} from "lucide-react";
import type { FunnelAnalyticsSummary, FunnelPeriodBucket } from "@shared/types/funnel";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const res = await fetch("/api/dashboard/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) { sessionStorage.setItem("e360_dashboard_auth", "true"); onAuth(); }
    else { setError("Invalid PIN."); setPin(""); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}>
            <Filter className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Funnel Analytics</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-funnel-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-funnel-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-funnel-login" className="btn-primary w-full py-3">Access Funnel Analytics</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, testId }: { icon: any; label: string; value: string | number; testId: string }) {
  return (
    <div className="lux-card">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><Icon className="h-4 w-4 text-[#F4A62A]" /> {label}</div>
      <p className="text-2xl font-black text-white mt-2" data-testid={testId}>{value}</p>
    </div>
  );
}

function FunnelStageBar({ label, count, maxCount, conversionPct, dropOffPct, isFirst, testId }: {
  label: string; count: number; maxCount: number;
  conversionPct: number | null; dropOffPct: number | null; isFirst: boolean; testId: string;
}) {
  const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 2;
  return (
    <div>
      {!isFirst && (
        <div className="flex items-center gap-3 py-1.5 pl-2 text-xs">
          <ArrowDown className="h-4 w-4 text-white/30" />
          {conversionPct !== null ? (
            <>
              <span className="text-emerald-400 font-semibold">{conversionPct}% continue</span>
              <span className="text-red-400/80 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {dropOffPct}% drop off</span>
            </>
          ) : (
            <span className="text-white/30">no data yet</span>
          )}
        </div>
      )}
      <div className="lux-card !py-3" data-testid={testId}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm font-semibold">{label}</span>
          <span className="text-white font-black">{count.toLocaleString()}</span>
        </div>
        <div className="h-2 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${width}%`, background: GOLD }} />
        </div>
      </div>
    </div>
  );
}

function TopList({ title, icon: Icon, items, emptyText }: {
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

type PeriodTab = "daily" | "weekly" | "monthly";

function PeriodTable({ buckets }: { buckets: FunnelPeriodBucket[] }) {
  if (buckets.length === 0) return <p className="text-white/35 text-sm mt-3">No funnel activity in this period yet.</p>;
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Period</th>
            <th className="text-right py-2 px-2">Strategy</th>
            <th className="text-right py-2 px-2">Pricing</th>
            <th className="text-right py-2 px-2">Plan</th>
            <th className="text-right py-2 px-2">Checkout</th>
            <th className="text-right py-2 px-2">Paid</th>
            <th className="text-right py-2 pl-2">Booked</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.bucket} className="border-t border-white/5 text-white/80" data-testid={`row-funnel-period-${b.bucket}`}>
              <td className="py-2 pr-4 text-white/60">{b.bucket}</td>
              <td className="text-right py-2 px-2">{b.strategy}</td>
              <td className="text-right py-2 px-2">{b.pricing}</td>
              <td className="text-right py-2 px-2">{b.plan}</td>
              <td className="text-right py-2 px-2">{b.checkout}</td>
              <td className="text-right py-2 px-2">{b.payment}</td>
              <td className="text-right py-2 pl-2 font-bold text-white">{b.booked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Console() {
  const [periodTab, setPeriodTab] = useState<PeriodTab>("daily");
  const query = useQuery<FunnelAnalyticsSummary>({
    queryKey: ["/api/dashboard/analytics/funnel"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/analytics/funnel");
      if (!res.ok) throw new Error(`Failed to load funnel analytics (${res.status})`);
      return res.json();
    },
  });

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
        <p className="text-white/60">Could not load funnel analytics.</p>
        <button onClick={() => query.refetch()} className="btn-primary px-6 py-2">Retry</button>
      </div>
    );
  }

  const data = query.data;
  const maxCount = Math.max(...data.stages.map((s) => s.count), 1);
  const conversionByTo = new Map(data.conversions.map((c) => [c.to, c]));

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Filter className="h-7 w-7" style={{ color: GOLD }} /> Funnel Analytics
            </h1>
            <p className="text-white/50 text-sm mt-1">Homepage → Strategy Session booking · Phase 72.2</p>
          </div>
          <button onClick={() => query.refetch()} data-testid="button-funnel-refresh" className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat icon={Users} label="Homepage Visitors" value={data.overall.visitors.toLocaleString()} testId="stat-funnel-visitors" />
          <Stat icon={Filter} label="Sessions Booked" value={data.overall.booked.toLocaleString()} testId="stat-funnel-booked" />
          <Stat icon={TrendingDown} label="Overall Conversion" value={data.overall.conversionPct !== null ? `${data.overall.conversionPct}%` : "—"} testId="stat-funnel-conversion" />
          <Stat icon={Clock} label="Avg. Time to Book" value={data.avgCompletionMinutes !== null ? `${data.avgCompletionMinutes} min` : "—"} testId="stat-funnel-completion-time" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-0.5">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-3">Customer Journey</h2>
            {data.stages.map((stage, i) => {
              const conv = conversionByTo.get(stage.key);
              return (
                <FunnelStageBar
                  key={stage.key}
                  label={stage.label}
                  count={stage.count}
                  maxCount={maxCount}
                  conversionPct={conv?.conversionPct ?? null}
                  dropOffPct={conv?.dropOffPct ?? null}
                  isFirst={i === 0}
                  testId={`stage-funnel-${stage.key}`}
                />
              );
            })}
          </div>

          <div className="space-y-4">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-3">Attribution</h2>
            <TopList title="Top Sources" icon={Globe} items={data.topSources} emptyText="No UTM sources captured yet." />
            <TopList title="Top Campaigns" icon={Megaphone} items={data.topCampaigns} emptyText="No campaigns captured yet." />
            <TopList title="Top Plans" icon={Layers} items={data.topPlans} emptyText="No plan selections yet." />
          </div>
        </div>

        <div className="lux-card mt-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">Funnel Over Time</h2>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as PeriodTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPeriodTab(tab)}
                  data-testid={`tab-funnel-${tab}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    periodTab === tab ? "text-black" : "text-white/60 bg-white/5 hover:bg-white/10"
                  }`}
                  style={periodTab === tab ? { background: GOLD } : undefined}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <PeriodTable buckets={data[periodTab]} />
        </div>

        <p className="text-white/30 text-xs mt-6">Generated {new Date(data.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function FunnelAnalytics() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
