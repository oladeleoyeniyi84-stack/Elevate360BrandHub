import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Rocket, Eye, EyeOff, Loader2, Sparkles, TrendingUp, TrendingDown, Minus,
  Lightbulb, AlertTriangle, CheckCircle2, MessageSquare, FileText, RefreshCw,
  Users, Send, Search, Filter, LineChart, Megaphone, Share2, PenTool,
  CheckCheck, XCircle, Target, Eye as EyeIcon,
} from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Opportunity = {
  id: number;
  kind: string;
  area: string;
  title: string;
  detail: string;
  priority: number;
  confidence: number;
  status: string;
  source: string;
  createdAt: string;
};

type HorizonForecast = {
  horizonDays: number; label: string; current: number; projected: number;
  low: number; high: number; changePct: number; trend: "up" | "down" | "flat"; confidence: number;
};

type LeadScoring = {
  total: number; emailCaptured: number; hot: number; qualified: number;
  bookedThisWeek: number; wonThisMonth: number; topIntent: string | null;
  captureRate: number; qualifyRate: number; hotRate: number; readinessScore: number;
  tiers: { tier: string; count: number }[];
};

type SeoAnalysis = {
  blogCount: number; daysSinceLastPost: number | null;
  cadenceHealth: "healthy" | "slowing" | "stalled" | "none";
  topPages: { page: string; views: number }[];
  opportunities: { title: string; detail: string; priority: number; confidence: number }[];
};

type Campaign = { id: number; title: string; channel: string; status: string; source: string; createdAt: string };

type Overview = {
  generatedAt: string;
  snapshot: {
    traffic: { totalViews: number; topPages: { page: string; views: number }[] };
    sources: { source: string; visits: number; chatLeads: number; qualifiedLeads: number; paidOrders: number; revenueCents: number; qualityScore: number }[];
    funnel: { stages: { name: string; count: number; rate: number }[] };
    socialChannels: { channel: string; label: string; handle: string }[];
    aiOps: { openai: string; deepseek: string; premiumModel: string; automationModel: string };
  };
  leadScoring: LeadScoring;
  seo: SeoAnalysis;
  conversionForecast: { horizons: HorizonForecast[]; currentRatePct: number };
  opportunities: {
    seo: Opportunity[]; content: Opportunity[]; campaign: Opportunity[];
    lead: Opportunity[]; conversion: Opportunity[]; social: Opportunity[]; all: Opportunity[];
  };
  campaigns: Campaign[];
  latestReports: { id: number; periodType: string; title: string; createdAt: string }[];
};

type Report = { id: number; periodType: string; title: string; summary: string; sections: any; createdAt: string };

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
            <Rocket className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Growth Automation</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-growth-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-growth-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-growth-login" className="btn-primary w-full py-3">Access Growth Automation</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="lux-card">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><Icon className="h-4 w-4 text-[#F4A62A]" /> {label}</div>
      <p className="text-2xl font-black text-white mt-2">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/55">{label}</span><span className="text-white font-medium">{value}</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-white/40" />;
}

function toneFor(kind: string) {
  if (["conversion"].includes(kind)) return { icon: AlertTriangle, color: "text-red-400", border: "border-red-400/20" };
  if (["campaign", "social"].includes(kind)) return { icon: CheckCircle2, color: "text-[#F4A62A]", border: "border-[#F4A62A]/20" };
  return { icon: Lightbulb, color: "text-emerald-400", border: "border-emerald-400/20" };
}

function OpportunityCard({ item, onStatus }: { item: Opportunity; onStatus: (id: number, status: string) => void }) {
  const tone = toneFor(item.kind);
  const Icon = tone.icon;
  return (
    <div className={`lux-card border ${tone.border}`} data-testid={`card-opportunity-${item.id}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${tone.color}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{item.area}</span>
            <span className="text-[10px] text-[#F4A62A]">priority {item.priority}</span>
            <span className="text-[10px] text-white/40">confidence {item.confidence}%</span>
          </div>
          <h3 className="font-semibold text-white mt-1.5" data-testid={`text-opportunity-title-${item.id}`}>{item.title}</h3>
          <p className="text-sm text-white/60 mt-1 whitespace-pre-line">{item.detail}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => onStatus(item.id, "acknowledged")} data-testid={`button-ack-${item.id}`}
              className="text-[11px] text-white/60 hover:text-white border border-white/15 rounded-lg px-2.5 py-1">Acknowledge</button>
            <button onClick={() => onStatus(item.id, "dismissed")} data-testid={`button-dismiss-${item.id}`}
              className="text-[11px] text-white/40 hover:text-white/70 px-2.5 py-1">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/70 truncate pr-2">{label}</span>
        <span className="text-white/50 shrink-0">{sub}</span>
      </div>
      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD }} />
      </div>
    </div>
  );
}

const CADENCE_LABEL: Record<string, string> = {
  healthy: "Healthy", slowing: "Slowing", stalled: "Stalled", none: "No content yet",
};

function Console() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<
    "briefing" | "leads" | "seo" | "content" | "campaigns" | "social" | "forecasts" | "opportunities" | "copilot" | "reports"
  >("briefing");

  const overview = useQuery<Overview>({
    queryKey: ["/api/admin/growth-automation/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/growth-automation/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); window.location.reload(); }
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const regen = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/growth-automation/opportunities/generate", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/growth-automation/overview"] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`/api/admin/growth-automation/opportunities/${id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/growth-automation/overview"] }),
  });

  const onStatus = (id: number, status: string) => setStatus.mutate({ id, status });

  const tabs = [
    { id: "briefing", label: "Briefing" },
    { id: "leads", label: "Lead Scoring" },
    { id: "seo", label: "SEO" },
    { id: "content", label: "Content" },
    { id: "campaigns", label: "Campaigns" },
    { id: "social", label: "Social" },
    { id: "forecasts", label: "Forecasts" },
    { id: "opportunities", label: "Opportunities" },
    { id: "copilot", label: "Copilot" },
    { id: "reports", label: "Reports" },
  ] as const;

  const snap = overview.data?.snapshot;
  const leads = overview.data?.leadScoring;
  const seo = overview.data?.seo;
  const forecast = overview.data?.conversionForecast;
  const opps = overview.data?.opportunities;
  const topOpportunity = opps?.all.find((o) => ["seo", "content", "lead"].includes(o.kind)) ?? opps?.all[0];
  const topRisk = opps?.conversion[0] ?? opps?.all.find((o) => o.kind === "conversion" || o.area === "funnel");
  const topAction = opps?.campaign[0] ?? opps?.content[0] ?? opps?.social[0];
  const maxTier = Math.max(1, ...(leads?.tiers ?? []).map((t) => t.count));
  const maxPage = Math.max(1, ...(snap?.traffic.topPages ?? []).map((p) => p.views));

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <Rocket className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Growth Automation</h1>
              <p className="text-white/40 text-xs">Phase 66 · unified growth automation engine</p>
            </div>
          </div>
          <button onClick={() => regen.mutate()} disabled={regen.isPending} data-testid="button-regen-opportunities"
            className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
            {regen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/8 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-growth-${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t.id ? "border-[#F4A62A] text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {overview.isLoading && <p className="text-white/40">Loading growth automation…</p>}

        {/* ── Briefing ── */}
        {tab === "briefing" && snap && leads && (
          <div className="space-y-5" data-testid="panel-growth-briefing">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={EyeIcon} label="Total page views" value={snap.traffic.totalViews} />
              <Stat icon={Users} label="Leads" value={leads.total} />
              <Stat icon={Target} label="Qualified" value={leads.qualified} />
              <Stat icon={LineChart} label="Lead readiness" value={`${leads.readinessScore}`} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-emerald-400" /> Top opportunity</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-opportunity">{topOpportunity?.title ?? "No opportunities yet — regenerate."}</p>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" /> Top risk</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-risk">{topRisk?.title ?? "No risks detected."}</p>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#F4A62A]" /> Next action</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-action">{topAction?.title ?? "Plan a growth campaign."}</p>
              </div>
            </div>
            <div className="lux-card">
              <h3 className="text-sm font-semibold text-white mb-3">Conversion forecast snapshot</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {forecast?.horizons.map((f) => (
                  <div key={f.horizonDays} className="bg-white/5 rounded-lg p-3" data-testid={`forecast-mini-${f.horizonDays}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">{f.label}</span><TrendIcon trend={f.trend} />
                    </div>
                    <p className="text-lg font-bold text-white mt-1">{f.projected}%</p>
                    <p className="text-[10px] text-white/35">{f.changePct > 0 ? "+" : ""}{f.changePct}% · confidence {f.confidence}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Lead Scoring ── */}
        {tab === "leads" && leads && (
          <div className="space-y-4" data-testid="panel-growth-leads">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={Users} label="Total leads" value={leads.total} />
              <Stat icon={Target} label="Hot leads" value={leads.hot} />
              <Stat icon={CheckCircle2} label="Qualified" value={leads.qualified} />
              <Stat icon={LineChart} label="Readiness" value={`${leads.readinessScore}`} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Lead quality tiers</h3>
                <div className="space-y-3">
                  {leads.tiers.map((t) => <Bar key={t.tier} label={t.tier} value={t.count} max={maxTier} sub={`${t.count}`} />)}
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Conversion rates</h3>
                <div className="space-y-1.5 text-sm">
                  <Row label="Email capture rate" value={`${leads.captureRate}%`} />
                  <Row label="Qualification rate" value={`${leads.qualifyRate}%`} />
                  <Row label="Hot lead rate" value={`${leads.hotRate}%`} />
                  <div className="pt-2 mt-2 border-t border-white/8">
                    <Row label="Booked this week" value={leads.bookedThisWeek} />
                    <Row label="Won this month" value={leads.wonThisMonth} />
                    <Row label="Top intent" value={leads.topIntent ?? "—"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SEO ── */}
        {tab === "seo" && seo && (
          <div className="space-y-4" data-testid="panel-growth-seo">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Stat icon={FileText} label="Published posts" value={seo.blogCount} />
              <Stat icon={RefreshCw} label="Cadence" value={CADENCE_LABEL[seo.cadenceHealth] ?? seo.cadenceHealth} />
              <Stat icon={Minus} label="Days since last post" value={seo.daysSinceLastPost ?? "—"} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Search className="h-4 w-4 text-[#F4A62A]" /> SEO opportunities</h3>
                <div className="space-y-3">
                  {seo.opportunities.length === 0 ? <p className="text-white/40 text-sm">No SEO gaps detected.</p> :
                    seo.opportunities.map((o, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3" data-testid={`seo-opp-${i}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#F4A62A]">priority {o.priority}</span>
                          <span className="text-[10px] text-white/40">confidence {o.confidence}%</span>
                        </div>
                        <p className="text-sm font-medium text-white mt-1">{o.title}</p>
                        <p className="text-xs text-white/55 mt-1">{o.detail}</p>
                      </div>
                    ))}
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Top traffic pages</h3>
                <div className="space-y-3">
                  {seo.topPages.length === 0 ? <p className="text-white/40 text-sm">No traffic tracked yet.</p> :
                    seo.topPages.map((p) => <Bar key={p.page} label={p.page} value={p.views} max={maxPage} sub={`${p.views}`} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {tab === "content" && <ContentTab />}

        {/* ── Campaigns ── */}
        {tab === "campaigns" && <CampaignsTab campaigns={overview.data?.campaigns ?? []} />}

        {/* ── Social ── */}
        {tab === "social" && <SocialTab channels={snap?.socialChannels ?? []} campaigns={(overview.data?.campaigns ?? []).filter((c) => c.source === "social")} />}

        {/* ── Forecasts ── */}
        {tab === "forecasts" && forecast && (
          <div className="space-y-4" data-testid="panel-growth-forecasts">
            <div className="lux-card">
              <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wide"><LineChart className="h-4 w-4 text-[#F4A62A]" /> Current conversion rate</div>
              <p className="text-2xl font-black text-white mt-2">{forecast.currentRatePct}%</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {forecast.horizons.map((f) => (
                <div key={f.horizonDays} className="lux-card" data-testid={`forecast-${f.horizonDays}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{f.label}</h3><TrendIcon trend={f.trend} />
                  </div>
                  <p className="text-2xl font-black text-[#F4A62A] mt-2">{f.projected}%</p>
                  <p className="text-xs text-white/40 mt-1">range {f.low}% – {f.high}%</p>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className={f.changePct > 0 ? "text-emerald-400" : f.changePct < 0 ? "text-red-400" : "text-white/40"}>
                      {f.changePct > 0 ? "+" : ""}{f.changePct}% vs current
                    </span>
                    <span className="text-white/40">confidence {f.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Opportunities ── */}
        {tab === "opportunities" && opps && (
          <div className="space-y-6" data-testid="panel-growth-opportunities">
            <div>
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-3">Opportunities</h2>
              <div className="space-y-3">
                {opps.all.filter((o) => ["seo", "content", "lead"].includes(o.kind)).length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                  opps.all.filter((o) => ["seo", "content", "lead"].includes(o.kind)).map((i) => <OpportunityCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide mb-3">Risks</h2>
              <div className="space-y-3">
                {opps.conversion.length === 0 ? <p className="text-white/40 text-sm">None detected.</p> :
                  opps.conversion.map((i) => <OpportunityCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4A62A] uppercase tracking-wide mb-3">Recommended actions</h2>
              <div className="space-y-3">
                {opps.all.filter((o) => ["campaign", "social"].includes(o.kind)).length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                  opps.all.filter((o) => ["campaign", "social"].includes(o.kind)).map((i) => <OpportunityCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
          </div>
        )}

        {tab === "copilot" && <Copilot />}
        {tab === "reports" && <Reports latest={overview.data?.latestReports ?? []} />}
      </div>
    </div>
  );
}

function ContentTab() {
  const [ideas, setIdeas] = useState<{ title: string; angle: string; targetIntent: string; channel: string }[] | null>(null);
  const gen = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/growth-automation/content/generate", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => setIdeas(data.ideas ?? []),
  });
  return (
    <div className="space-y-4" data-testid="panel-growth-content">
      <button onClick={() => gen.mutate()} disabled={gen.isPending} data-testid="button-generate-content" className="btn-primary px-4 py-2.5 flex items-center gap-2">
        {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate content ideas
      </button>
      <p className="text-xs text-white/40">Recommendation-only — ideas are researched for your review, never auto-published.</p>
      {gen.isPending && <p className="text-white/40">Researching content ideas…</p>}
      {ideas && (
        <div className="grid md:grid-cols-2 gap-3">
          {ideas.length === 0 ? <p className="text-white/40 text-sm">No ideas generated.</p> :
            ideas.map((idea, i) => (
              <div key={i} className="lux-card" data-testid={`content-idea-${i}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A] border border-[#F4A62A]/30 rounded px-1.5">{idea.channel}</span>
                  <span className="text-[10px] text-white/40">{idea.targetIntent}</span>
                </div>
                <h3 className="font-semibold text-white mt-2">{idea.title}</h3>
                <p className="text-sm text-white/60 mt-1">{idea.angle}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const PLAN_CHANNELS = ["multi", "blog", "instagram", "youtube", "email", "etsy", "audiomack"];

function CampaignStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "text-white/50 border-white/20", approved: "text-emerald-400 border-emerald-400/30",
    rejected: "text-red-400 border-red-400/30", pending_approval: "text-[#F4A62A] border-[#F4A62A]/30",
  };
  return <span className={`text-[10px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 ${map[status] ?? "text-white/50 border-white/20"}`}>{status.replace("_", " ")}</span>;
}

function CampaignsTab({ campaigns }: { campaigns: Campaign[] }) {
  const qc = useQueryClient();
  const [objective, setObjective] = useState("");
  const [channel, setChannel] = useState("multi");
  const [openId, setOpenId] = useState<number | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/growth-automation/overview"] });

  const plan = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/growth-automation/campaigns/plan", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective, channel }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (c: Campaign) => { setObjective(""); setOpenId(c.id); invalidate(); },
  });

  const approve = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/growth-automation/campaigns/${id}/approve`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/growth-automation/campaigns/${id}/reject`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: invalidate,
  });

  const detail = useQuery<any>({
    queryKey: ["/api/admin/growth-automation/campaigns", openId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/growth-automation/campaigns/${openId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: openId != null,
  });

  return (
    <div className="space-y-4" data-testid="panel-growth-campaigns">
      <div className="lux-card space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Megaphone className="h-4 w-4 text-[#F4A62A]" /> Plan a campaign</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (objective.trim()) plan.mutate(); }} className="flex flex-col md:flex-row gap-2">
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Campaign objective (e.g. drive book sales)"
            data-testid="input-campaign-objective" className="flex-1 bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30" />
          <select value={channel} onChange={(e) => setChannel(e.target.value)} data-testid="select-campaign-channel"
            className="bg-white/6 border border-white/10 rounded-lg px-3 text-white">
            {PLAN_CHANNELS.map((c) => <option key={c} value={c} className="bg-[#0d1a2e]">{c}</option>)}
          </select>
          <button type="submit" disabled={plan.isPending || !objective.trim()} data-testid="button-plan-campaign" className="btn-primary px-4 flex items-center gap-2">
            {plan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Plan
          </button>
        </form>
        <p className="text-xs text-white/40">Recommendation-only — plans require your approval before any launch. Nothing is executed automatically.</p>
      </div>

      {openId != null && (
        <div className="lux-card" data-testid="card-campaign-detail">
          {detail.isLoading ? <p className="text-white/40">Loading plan…</p> : detail.data && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">{detail.data.title}</h3>
                <CampaignStatus status={detail.data.status} />
              </div>
              {detail.data.plan?.summary && <p className="text-sm text-white/80 mt-2">{detail.data.plan.summary}</p>}
              {Array.isArray(detail.data.plan?.steps) && detail.data.plan.steps.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-white/50 uppercase mb-1">Steps</p>
                  <ul className="list-disc list-inside text-sm text-white/70 space-y-0.5">
                    {detail.data.plan.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(detail.data.plan?.copy) && detail.data.plan.copy.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-white/50 uppercase mb-1">Ready-to-use copy</p>
                  <ul className="text-sm text-white/70 space-y-1">
                    {detail.data.plan.copy.map((s: string, i: number) => <li key={i} className="bg-white/5 rounded p-2">{s}</li>)}
                  </ul>
                </div>
              )}
              {["draft", "pending_approval"].includes(detail.data.status) && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => approve.mutate(detail.data.id)} disabled={approve.isPending} data-testid="button-approve-campaign"
                    className="btn-primary px-4 py-2 flex items-center gap-2 text-sm"><CheckCheck className="h-4 w-4" /> Approve</button>
                  <button onClick={() => reject.mutate(detail.data.id)} disabled={reject.isPending} data-testid="button-reject-campaign"
                    className="text-sm text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg px-4 py-2 flex items-center gap-2"><XCircle className="h-4 w-4" /> Reject</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Campaigns</h3>
        {campaigns.length === 0 ? <p className="text-white/40 text-sm">No campaigns yet. Plan one above.</p> :
          <div className="space-y-2">
            {campaigns.map((c) => (
              <button key={c.id} onClick={() => setOpenId(c.id)} data-testid={`row-campaign-${c.id}`}
                className="w-full text-left lux-card flex items-center justify-between hover:border-[#F4A62A]/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{c.channel}</span>
                    <CampaignStatus status={c.status} />
                  </div>
                  <p className="text-sm text-white mt-0.5">{c.title}</p>
                </div>
                <Megaphone className="h-4 w-4 text-white/40" />
              </button>
            ))}
          </div>}
      </div>
    </div>
  );
}

const SOCIAL_DRAFT_CHANNELS = ["instagram", "youtube", "email", "blog"];

function SocialTab({ channels, campaigns }: { channels: { channel: string; label: string; handle: string }[]; campaigns: Campaign[] }) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/growth-automation/overview"] });

  const draft = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/growth-automation/social/draft", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, topic }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (c: Campaign) => { setTopic(""); setOpenId(c.id); invalidate(); },
  });

  const detail = useQuery<any>({
    queryKey: ["/api/admin/growth-automation/campaigns", "social", openId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/growth-automation/campaigns/${openId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: openId != null,
  });

  return (
    <div className="space-y-4" data-testid="panel-growth-social">
      <div className="lux-card">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Share2 className="h-4 w-4 text-[#F4A62A]" /> Brand channels</h3>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <span key={c.channel} className="text-xs text-white/60 border border-white/15 rounded-full px-3 py-1.5" data-testid={`channel-${c.channel}`}>{c.label} · {c.handle}</span>
          ))}
        </div>
      </div>

      <div className="lux-card space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><PenTool className="h-4 w-4 text-[#F4A62A]" /> Draft a social workflow</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (topic.trim()) draft.mutate(); }} className="flex flex-col md:flex-row gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. launch of Video Crafter)"
            data-testid="input-social-topic" className="flex-1 bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30" />
          <select value={channel} onChange={(e) => setChannel(e.target.value)} data-testid="select-social-channel"
            className="bg-white/6 border border-white/10 rounded-lg px-3 text-white">
            {SOCIAL_DRAFT_CHANNELS.map((c) => <option key={c} value={c} className="bg-[#0d1a2e]">{c}</option>)}
          </select>
          <button type="submit" disabled={draft.isPending || !topic.trim()} data-testid="button-draft-social" className="btn-primary px-4 flex items-center gap-2">
            {draft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Draft
          </button>
        </form>
        <p className="text-xs text-white/40">Recommendation-only — drafts are prepared for your review and require approval before any posting.</p>
      </div>

      {openId != null && detail.data && (
        <div className="lux-card" data-testid="card-social-detail">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">{detail.data.title}</h3>
            <CampaignStatus status={detail.data.status} />
          </div>
          {Array.isArray(detail.data.plan?.posts) && detail.data.plan.posts.map((p: any, i: number) => (
            <div key={i} className="bg-white/5 rounded-lg p-3 mt-3" data-testid={`social-post-${i}`}>
              <p className="text-sm font-semibold text-white">{p.hook}</p>
              <p className="text-sm text-white/70 mt-1 whitespace-pre-line">{p.body}</p>
              {Array.isArray(p.hashtags) && p.hashtags.length > 0 && <p className="text-xs text-[#F4A62A] mt-2">{p.hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")}</p>}
              {p.cta && <p className="text-xs text-white/50 mt-1">CTA: {p.cta}</p>}
            </div>
          ))}
        </div>
      )}

      {campaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Recent social drafts</h3>
          <div className="space-y-2">
            {campaigns.map((c) => (
              <button key={c.id} onClick={() => setOpenId(c.id)} data-testid={`row-social-${c.id}`}
                className="w-full text-left lux-card flex items-center justify-between hover:border-[#F4A62A]/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{c.channel}</span>
                    <CampaignStatus status={c.status} />
                  </div>
                  <p className="text-sm text-white mt-0.5">{c.title}</p>
                </div>
                <Share2 className="h-4 w-4 text-white/40" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Copilot() {
  const SUGGESTIONS = [
    "How do I get more traffic?",
    "Which channel should I focus on?",
    "Why aren't my leads converting?",
    "What should I publish next?",
  ];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; grounding: { opportunities: string[]; risks: string[]; actions: string[] } } | null>(null);

  const ask = useMutation({
    mutationFn: async (q: string) => {
      const r = await fetch("/api/admin/growth-automation/copilot", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => setAnswer(data),
  });

  const submit = (q: string) => { if (q.trim()) ask.mutate(q.trim()); };

  return (
    <div className="space-y-4" data-testid="panel-growth-copilot">
      <form onSubmit={(e) => { e.preventDefault(); submit(question); }} className="flex gap-2">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask your growth copilot anything…"
          data-testid="input-copilot-question" className="flex-1 bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30" />
        <button type="submit" disabled={ask.isPending || !question.trim()} data-testid="button-copilot-ask" className="btn-primary px-4 flex items-center gap-2">
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => { setQuestion(s); submit(s); }} data-testid={`button-suggestion-${s.slice(0, 10)}`}
            className="text-xs text-white/60 hover:text-white border border-white/15 rounded-full px-3 py-1.5">{s}</button>
        ))}
      </div>
      {ask.isPending && <p className="text-white/40">Thinking…</p>}
      {answer && (
        <div className="lux-card" data-testid="text-copilot-answer">
          <div className="flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4 text-[#F4A62A]" /><span className="text-sm font-semibold text-white">Growth Copilot</span></div>
          <p className="text-sm text-white/80 whitespace-pre-line">{answer.answer}</p>
          {(answer.grounding.opportunities.length > 0 || answer.grounding.risks.length > 0) && (
            <div className="mt-3 pt-3 border-t border-white/8 text-[11px] text-white/40">
              Grounded in {answer.grounding.opportunities.length} opportunities · {answer.grounding.risks.length} risks · {answer.grounding.actions.length} actions
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Reports({ latest }: { latest: { id: number; periodType: string; title: string; createdAt: string }[] }) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState("daily");
  const [openId, setOpenId] = useState<number | null>(null);

  const gen = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/growth-automation/reports", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data: Report) => { setOpenId(data.id); qc.invalidateQueries({ queryKey: ["/api/admin/growth-automation/overview"] }); },
  });

  const detail = useQuery<Report>({
    queryKey: ["/api/admin/growth-automation/reports", openId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/growth-automation/reports/${openId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: openId != null,
  });

  return (
    <div className="space-y-4" data-testid="panel-growth-reports">
      <div className="flex gap-2">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} data-testid="select-report-period"
          className="bg-white/6 border border-white/10 rounded-lg px-3 text-white">
          {["daily", "weekly", "monthly", "quarterly"].map((p) => <option key={p} value={p} className="bg-[#0d1a2e]">{p}</option>)}
        </select>
        <button onClick={() => gen.mutate()} disabled={gen.isPending} data-testid="button-generate-report" className="btn-primary px-4 flex items-center gap-2">
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Generate executive report
        </button>
      </div>

      {openId != null && (
        <div className="lux-card" data-testid="card-report-detail">
          {detail.isLoading ? <p className="text-white/40">Loading report…</p> : detail.data && (
            <>
              <h3 className="font-bold text-white">{detail.data.title}</h3>
              <p className="text-sm text-white/80 mt-2 whitespace-pre-line" data-testid="text-report-summary">{detail.data.summary}</p>
            </>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Recent reports</h3>
        {latest.length === 0 ? <p className="text-white/40 text-sm">No reports yet. Generate one above.</p> :
          <div className="space-y-2">
            {latest.map((r) => (
              <button key={r.id} onClick={() => setOpenId(r.id)} data-testid={`row-report-${r.id}`}
                className="w-full text-left lux-card flex items-center justify-between hover:border-[#F4A62A]/30">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{r.periodType}</span>
                  <p className="text-sm text-white mt-0.5">{r.title}</p>
                </div>
                <FileText className="h-4 w-4 text-white/40" />
              </button>
            ))}
          </div>}
      </div>
    </div>
  );
}

export default function GrowthAutomation() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
