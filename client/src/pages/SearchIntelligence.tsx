// Phase 72.4 — Founder-only Search Intelligence & Authority Platform dashboard.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Bot, Users, Globe, Eye, EyeOff, BookOpen, CheckCircle2, DollarSign,
  Link2, Megaphone, Award, Loader2, RefreshCw, Filter, FileText,
} from "lucide-react";
import type { SearchIntelSummary, SearchTrendBucket, ContentAuthorityItem, TrafficSourceBreakdownItem } from "@shared/types/searchIntel";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

const SOURCE_LABELS: Record<string, string> = {
  google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo", yahoo: "Yahoo",
  yandex: "Yandex", other_search: "Other search", ai_assistant: "AI assistants",
  social: "Social", email: "Email", paid: "Paid", referral: "Referral", direct: "Direct",
};

const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
const fmtUsd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

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
            <Search className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Search Intelligence</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-search-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-search-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-search-login" className="btn-primary w-full py-3">Access Search Intelligence</button>
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

function SourceRow({ item, maxSessions }: { item: TrafficSourceBreakdownItem; maxSessions: number }) {
  const width = maxSessions > 0 ? Math.max((item.sessions / maxSessions) * 100, item.sessions > 0 ? 3 : 0) : 0;
  return (
    <div data-testid={`row-source-${item.source}`}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-white/75">{SOURCE_LABELS[item.source] ?? item.source}</span>
        <span className="text-white/50 text-xs">
          {item.funnelSessions > 0 && <span className="mr-3">funnel {item.funnelSessions}</span>}
          {item.revenueSessions > 0 && <span className="mr-3">revenue {item.revenueSessions}</span>}
          {item.attributedRevenueCents > 0 && <span className="mr-3 text-emerald-400">{fmtUsd(item.attributedRevenueCents)}</span>}
          <span className="text-white font-bold text-sm">{item.sessions.toLocaleString()}</span>
          <span className="ml-2">{fmtPct(item.sharePct)}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: GOLD }} />
      </div>
    </div>
  );
}

function AuthorityTable({ items }: { items: ContentAuthorityItem[] }) {
  if (items.length === 0) {
    return <p className="text-white/35 text-sm mt-3">No content engagement tracked yet — authority scores appear once posts and articles get views.</p>;
  }
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Content</th>
            <th className="text-right py-2 px-2">Views</th>
            <th className="text-right py-2 px-2">Depth</th>
            <th className="text-right py-2 px-2">Compl.</th>
            <th className="text-right py-2 px-2">Shares</th>
            <th className="text-right py-2 pl-2">Authority</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.slug} className="border-t border-white/5 text-white/80" data-testid={`row-authority-${c.slug}`}>
              <td className="py-2 pr-4">
                <span className="text-white/85 break-all">{c.slug}</span>
                {c.contentType && <span className="ml-2 text-[10px] uppercase tracking-wide text-white/35">{c.contentType}</span>}
              </td>
              <td className="text-right py-2 px-2">{c.views.toLocaleString()}</td>
              <td className="text-right py-2 px-2">{fmtPct(c.avgReadPercent)}</td>
              <td className="text-right py-2 px-2">{fmtPct(c.completionRatePct)}</td>
              <td className="text-right py-2 px-2">{c.shares.toLocaleString()}</td>
              <td className="text-right py-2 pl-2">
                <div className="inline-flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.authorityIndex}%`, background: GOLD }} />
                  </div>
                  <span className="font-bold text-white w-7 text-right">{c.authorityIndex}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PeriodTab = "daily" | "weekly" | "monthly";

function TrendTable({ buckets }: { buckets: SearchTrendBucket[] }) {
  if (buckets.length === 0) return <p className="text-white/35 text-sm mt-3">No search activity in this period yet.</p>;
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Period</th>
            <th className="text-right py-2 px-2">Landings</th>
            <th className="text-right py-2 px-2">Organic</th>
            <th className="text-right py-2 px-2">AI</th>
            <th className="text-right py-2 pl-2">Content views</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.bucket} className="border-t border-white/5 text-white/80" data-testid={`row-search-period-${b.bucket}`}>
              <td className="py-2 pr-4 text-white/60">{b.bucket}</td>
              <td className="text-right py-2 px-2 font-bold text-white">{b.landings}</td>
              <td className="text-right py-2 px-2">{b.organic}</td>
              <td className="text-right py-2 px-2">{b.aiAssistant}</td>
              <td className="text-right py-2 pl-2">{b.contentViews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Console() {
  const [periodTab, setPeriodTab] = useState<PeriodTab>("daily");
  const query = useQuery<SearchIntelSummary>({
    queryKey: ["/api/dashboard/analytics/search"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/analytics/search");
      if (!res.ok) throw new Error(`Failed to load search intelligence (${res.status})`);
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
        <p className="text-white/60">Could not load search intelligence.</p>
        <button onClick={() => query.refetch()} className="btn-primary px-6 py-2">Retry</button>
      </div>
    );
  }

  const data = query.data;
  const { kpis, diagnostics, footprint } = data;
  const maxSessions = Math.max(...data.sources.map((s) => s.sessions), 0);
  const periodBuckets = periodTab === "daily" ? data.daily : periodTab === "weekly" ? data.weekly : data.monthly;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
              <Search className="h-7 w-7" style={{ color: GOLD }} /> Search Intelligence
            </h1>
            <p className="text-white/45 text-sm mt-1">
              First-party search & content authority — organic and AI-assistant attribution joined to funnel and revenue outcomes.
            </p>
          </div>
          <button
            onClick={() => query.refetch()}
            data-testid="button-search-refresh"
            className="flex items-center gap-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2 text-sm transition"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={Users} label="Attributed sessions" value={kpis.attributedSessions.toLocaleString()} testId="stat-search-sessions" />
          <Stat icon={Search} label="Organic share" value={fmtPct(kpis.organicSharePct)} testId="stat-search-organic-share" />
          <Stat icon={Bot} label="AI assistant sessions" value={kpis.aiAssistantSessions.toLocaleString()} testId="stat-search-ai-sessions" />
          <Stat icon={Globe} label="Landings · 30d" value={kpis.landingsLast30d.toLocaleString()} testId="stat-search-landings-30d" />
          <Stat icon={Eye} label="Content views" value={kpis.contentViews.toLocaleString()} testId="stat-search-content-views" />
          <Stat icon={BookOpen} label="Avg read depth" value={fmtPct(kpis.avgReadPercent)} testId="stat-search-read-depth" />
          <Stat icon={CheckCircle2} label="Completion rate" value={fmtPct(kpis.contentCompletionRatePct)} testId="stat-search-completion" />
          <Stat icon={DollarSign} label="Attributed revenue" value={fmtUsd(kpis.attributedRevenueCents)} testId="stat-search-revenue" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="lux-card">
              <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-4">Traffic sources</h2>
              {kpis.attributedSessions === 0 ? (
                <p className="text-white/35 text-sm">No search landings captured yet — sessions appear as soon as visitors arrive.</p>
              ) : (
                <div className="space-y-3">
                  {data.sources.map((s) => <SourceRow key={s.source} item={s} maxSessions={maxSessions} />)}
                </div>
              )}
            </div>

            <div className="lux-card">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-[#F4A62A]" />
                <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">Content authority</h2>
              </div>
              <p className="text-white/35 text-xs">
                First-party engagement authority (reach · depth · completion · amplification) — not third-party domain authority.
              </p>
              <AuthorityTable items={data.contentAuthority} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-3">Outcomes & attribution</h2>
            <div className="lux-card">
              <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><Filter className="h-4 w-4 text-[#F4A62A]" /> Search → Outcomes</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between" data-testid="row-search-to-funnel">
                  <span className="text-white/75">Entered funnel</span>
                  <span className="text-white font-bold">{kpis.searchToFunnelSessions.toLocaleString()} <span className="text-white/40 font-normal">({fmtPct(kpis.searchToFunnelRatePct)})</span></span>
                </div>
                <div className="flex items-center justify-between" data-testid="row-search-to-revenue">
                  <span className="text-white/75">Revenue-engaged</span>
                  <span className="text-white font-bold">{kpis.searchToRevenueSessions.toLocaleString()} <span className="text-white/40 font-normal">({fmtPct(kpis.searchToRevenueRatePct)})</span></span>
                </div>
                <div className="flex items-center justify-between" data-testid="row-search-attributed-revenue">
                  <span className="text-white/75">Attributed revenue</span>
                  <span className="text-emerald-400 font-bold">{fmtUsd(kpis.attributedRevenueCents)}</span>
                </div>
                <div className="flex items-center justify-between" data-testid="row-search-shares">
                  <span className="text-white/75">Content shares</span>
                  <span className="text-white font-bold">{kpis.contentShares.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <TopList title="Referrer hosts" icon={Globe} items={data.topReferrerHosts} emptyText="No external referrers yet." />
            <TopList title="Landing paths" icon={Link2} items={data.topLandingPaths} emptyText="No landing paths tracked yet." />
            <TopList title="Campaigns" icon={Megaphone} items={data.topCampaigns} emptyText="No UTM campaigns seen yet." />
            <div className="lux-card">
              <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><FileText className="h-4 w-4 text-[#F4A62A]" /> Content footprint</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-white/75">Published blog posts</span><span className="text-white font-bold" data-testid="text-footprint-published">{footprint.publishedBlogPosts}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/75">Tracked content pages</span><span className="text-white font-bold" data-testid="text-footprint-tracked">{footprint.trackedContentPages}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/75">Published, never viewed</span><span className={`font-bold ${footprint.publishedNeverViewed > 0 ? "text-amber-400" : "text-white"}`} data-testid="text-footprint-never-viewed">{footprint.publishedNeverViewed}</span></div>
              </div>
            </div>
            <div className="lux-card">
              <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><CheckCircle2 className="h-4 w-4 text-[#F4A62A]" /> Data integrity</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-white/75">Duplicate landing groups</span><span className={`font-bold ${diagnostics.duplicateLandingGroups > 0 ? "text-red-400" : "text-emerald-400"}`} data-testid="text-diag-dup-landings">{diagnostics.duplicateLandingGroups}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/75">Landings w/o session</span><span className="text-white font-bold" data-testid="text-diag-no-session">{diagnostics.landingsWithoutSession}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/75">Content w/o landing</span><span className="text-white font-bold" data-testid="text-diag-content-no-landing">{diagnostics.contentSessionsWithoutLanding}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/75">Unclassified referral hosts</span><span className="text-white font-bold" data-testid="text-diag-referral-hosts">{diagnostics.referralHostCount}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/75">Funnel join coverage</span><span className="text-white font-bold" data-testid="text-diag-funnel-coverage">{fmtPct(diagnostics.funnelJoinCoveragePct)}</span></div>
                <div className="flex items-center justify-between"><span className="text-white/75">Revenue events w/ session</span><span className="text-white font-bold" data-testid="text-diag-revenue-session">{fmtPct(diagnostics.revenueEventsWithSessionPct)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lux-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">Trends</h2>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPeriodTab(t)}
                  data-testid={`tab-search-${t}`}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    periodTab === t ? "text-black" : "text-white/60 bg-white/5 hover:bg-white/10"
                  }`}
                  style={periodTab === t ? { background: GOLD } : undefined}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <TrendTable buckets={periodBuckets} />
        </div>

        <div className="lux-card space-y-3">
          <p className="text-white/40 text-xs leading-relaxed"><span className="text-white/60 font-semibold">Authority formula:</span> {data.authorityFormula}</p>
          <p className="text-white/40 text-xs leading-relaxed" data-testid="text-search-attribution-note"><span className="text-white/60 font-semibold">Attribution note:</span> {data.attributionNote}</p>
          <p className="text-white/30 text-xs">Generated {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function SearchIntelligence() {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("e360_dashboard_auth") === "true"; } catch { return false; }
  });
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
