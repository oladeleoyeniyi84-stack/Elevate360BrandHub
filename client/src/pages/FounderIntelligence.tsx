import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown, Eye, EyeOff, Loader2, Sparkles, TrendingUp, TrendingDown, Minus,
  Lightbulb, AlertTriangle, CheckCircle2, MessageSquare, FileText, RefreshCw,
  Activity, DollarSign, Users, Send,
} from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type DecisionItem = {
  id: number;
  kind: "opportunity" | "risk" | "action";
  area: string;
  title: string;
  detail: string;
  priority: number;
  confidence: number;
  status: string;
  source: string;
  createdAt: string;
};

type Forecast = {
  metric: string;
  label: string;
  unit: "currency" | "count" | "percent";
  current: number;
  projectedNext7: number;
  changePct: number;
  trend: "up" | "down" | "flat";
  confidence: number;
};

type Overview = {
  generatedAt: string;
  snapshot: {
    revenue: { combinedRevenueCents: number; paidOrders: number; wonDeals: number; avgOrderValueCents: number; byOffer: { name: string; revenue: number; count: number }[] };
    pipeline: { totalLeads: number; hot: number; qualified: number; bookedThisWeek: number; wonThisMonth: number; topIntent: string | null };
    growth: { recommendations: number; topRecommendation: string | null };
    experiments: { running: number };
    personalization: { segments: number; avgCvr: number };
    aiOps: { openai: string; deepseek: string; premiumModel: string; automationModel: string };
    memory: { total: number; embeddingCoverage: number };
    urgency: { overdueHotLeads: number; unrepliedContacts: number; pendingBookings: number; paidOrdersToday: number };
  };
  forecasts: Forecast[];
  decisions: { opportunities: DecisionItem[]; risks: DecisionItem[]; actions: DecisionItem[] };
  latestReports: { id: number; periodType: string; title: string; createdAt: string }[];
};

type Report = {
  id: number;
  periodType: string;
  title: string;
  summary: string;
  sections: any;
  createdAt: string;
};

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

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
            <Crown className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Founder Intelligence</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-intel-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-intel-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-intel-login" className="btn-primary w-full py-3">Access Founder Intelligence</button>
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

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-white/40" />;
}

function DecisionCard({ item, onStatus }: { item: DecisionItem; onStatus: (id: number, status: string) => void }) {
  const tone =
    item.kind === "opportunity" ? { icon: Lightbulb, color: "text-emerald-400", border: "border-emerald-400/20" }
    : item.kind === "risk" ? { icon: AlertTriangle, color: "text-red-400", border: "border-red-400/20" }
    : { icon: CheckCircle2, color: "text-[#F4A62A]", border: "border-[#F4A62A]/20" };
  const Icon = tone.icon;
  return (
    <div className={`lux-card border ${tone.border}`} data-testid={`card-decision-${item.id}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${tone.color}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{item.area}</span>
            <span className="text-[10px] text-[#F4A62A]">priority {item.priority}</span>
            <span className="text-[10px] text-white/40">confidence {item.confidence}%</span>
          </div>
          <h3 className="font-semibold text-white mt-1.5" data-testid={`text-decision-title-${item.id}`}>{item.title}</h3>
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

function Console() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"briefing" | "decisions" | "intelligence" | "forecasts" | "copilot" | "reports">("briefing");

  const overview = useQuery<Overview>({
    queryKey: ["/api/admin/founder-intel/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/founder-intel/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); window.location.reload(); }
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const regen = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/founder-intel/decisions/generate", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/founder-intel/overview"] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`/api/admin/founder-intel/decisions/${id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/founder-intel/overview"] }),
  });

  const onStatus = (id: number, status: string) => setStatus.mutate({ id, status });

  const tabs = [
    { id: "briefing", label: "Briefing" },
    { id: "decisions", label: "Decision Center" },
    { id: "intelligence", label: "Intelligence" },
    { id: "forecasts", label: "Forecasts" },
    { id: "copilot", label: "Copilot" },
    { id: "reports", label: "Reports" },
  ] as const;

  const snap = overview.data?.snapshot;
  const d = overview.data?.decisions;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <Crown className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Founder Intelligence</h1>
              <p className="text-white/40 text-xs">Phase 64 · executive intelligence & decision center</p>
            </div>
          </div>
          <button onClick={() => regen.mutate()} disabled={regen.isPending} data-testid="button-regen-decisions"
            className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
            {regen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/8 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-intel-${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t.id ? "border-[#F4A62A] text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {overview.isLoading && <p className="text-white/40">Loading intelligence…</p>}

        {tab === "briefing" && snap && (
          <div className="space-y-5" data-testid="panel-intel-briefing">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={DollarSign} label="Revenue" value={usd(snap.revenue.combinedRevenueCents)} />
              <Stat icon={Users} label="Total leads" value={snap.pipeline.totalLeads} />
              <Stat icon={Activity} label="Hot leads" value={snap.pipeline.hot} />
              <Stat icon={Sparkles} label="Booked / week" value={snap.pipeline.bookedThisWeek} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-emerald-400" /> Top opportunity</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-opportunity">{d?.opportunities[0]?.title ?? "No opportunities yet — regenerate."}</p>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" /> Top risk</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-risk">{d?.risks[0]?.title ?? "No risks detected."}</p>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#F4A62A]" /> Next action</h3>
                <p className="text-sm text-white/70" data-testid="text-briefing-action">{d?.actions[0]?.title ?? "Review your dashboard."}</p>
              </div>
            </div>
            <div className="lux-card">
              <h3 className="text-sm font-semibold text-white mb-3">Forecast snapshot</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {overview.data?.forecasts.map((f) => (
                  <div key={f.metric} className="bg-white/5 rounded-lg p-3" data-testid={`forecast-mini-${f.metric}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">{f.label}</span><TrendIcon trend={f.trend} />
                    </div>
                    <p className="text-lg font-bold text-white mt-1">{f.changePct > 0 ? "+" : ""}{f.changePct}%</p>
                    <p className="text-[10px] text-white/35">confidence {f.confidence}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "decisions" && d && (
          <div className="space-y-6" data-testid="panel-intel-decisions">
            <div>
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-3">Opportunities</h2>
              <div className="space-y-3">
                {d.opportunities.length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                  d.opportunities.map((i) => <DecisionCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide mb-3">Risks</h2>
              <div className="space-y-3">
                {d.risks.length === 0 ? <p className="text-white/40 text-sm">None detected.</p> :
                  d.risks.map((i) => <DecisionCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4A62A] uppercase tracking-wide mb-3">Recommended actions</h2>
              <div className="space-y-3">
                {d.actions.length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                  d.actions.map((i) => <DecisionCard key={i.id} item={i} onStatus={onStatus} />)}
              </div>
            </div>
          </div>
        )}

        {tab === "intelligence" && snap && (
          <div className="space-y-4" data-testid="panel-intel-intelligence">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Revenue</h3>
                <div className="space-y-1.5 text-sm">
                  <Row label="Combined revenue" value={usd(snap.revenue.combinedRevenueCents)} />
                  <Row label="Paid orders" value={snap.revenue.paidOrders} />
                  <Row label="Won deals" value={snap.revenue.wonDeals} />
                  <Row label="Avg order value" value={usd(snap.revenue.avgOrderValueCents)} />
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Pipeline</h3>
                <div className="space-y-1.5 text-sm">
                  <Row label="Total leads" value={snap.pipeline.totalLeads} />
                  <Row label="Hot" value={snap.pipeline.hot} />
                  <Row label="Qualified" value={snap.pipeline.qualified} />
                  <Row label="Won this month" value={snap.pipeline.wonThisMonth} />
                  <Row label="Top intent" value={snap.pipeline.topIntent ?? "—"} />
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">Growth & experiments</h3>
                <div className="space-y-1.5 text-sm">
                  <Row label="Growth recommendations" value={snap.growth.recommendations} />
                  <Row label="Running experiments" value={snap.experiments.running} />
                  <Row label="Segments" value={snap.personalization.segments} />
                  <Row label="Avg segment CVR" value={`${snap.personalization.avgCvr}%`} />
                </div>
              </div>
              <div className="lux-card">
                <h3 className="text-sm font-semibold text-white mb-3">AI & memory</h3>
                <div className="space-y-1.5 text-sm">
                  <Row label="OpenAI" value={snap.aiOps.openai} />
                  <Row label="DeepSeek" value={snap.aiOps.deepseek} />
                  <Row label="Memories" value={snap.memory.total} />
                  <Row label="Embedding coverage" value={`${snap.memory.embeddingCoverage}%`} />
                </div>
              </div>
              <div className="lux-card md:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-3">Urgency</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Row label="Overdue hot leads" value={snap.urgency.overdueHotLeads} />
                  <Row label="Unreplied contacts" value={snap.urgency.unrepliedContacts} />
                  <Row label="Pending bookings" value={snap.urgency.pendingBookings} />
                  <Row label="Paid orders today" value={snap.urgency.paidOrdersToday} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "forecasts" && (
          <div className="grid md:grid-cols-2 gap-4" data-testid="panel-intel-forecasts">
            {overview.data?.forecasts.map((f) => (
              <div key={f.metric} className="lux-card" data-testid={`forecast-${f.metric}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{f.label}</h3><TrendIcon trend={f.trend} />
                </div>
                <div className="flex items-end gap-3 mt-3">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase">Current 7d</p>
                    <p className="text-lg font-bold text-white">{f.unit === "currency" ? usd(f.current) : f.unit === "percent" ? `${f.current}%` : f.current}</p>
                  </div>
                  <div className="text-white/30">→</div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase">Projected 7d</p>
                    <p className="text-lg font-bold text-[#F4A62A]">{f.unit === "currency" ? usd(f.projectedNext7) : f.unit === "percent" ? `${f.projectedNext7}%` : f.projectedNext7}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className={f.changePct > 0 ? "text-emerald-400" : f.changePct < 0 ? "text-red-400" : "text-white/40"}>
                    {f.changePct > 0 ? "+" : ""}{f.changePct}% projected
                  </span>
                  <span className="text-white/40">confidence {f.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "copilot" && <Copilot />}

        {tab === "reports" && <Reports latest={overview.data?.latestReports ?? []} />}
      </div>
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

function Copilot() {
  const SUGGESTIONS = [
    "What should I focus on today?",
    "What is hurting growth?",
    "What opportunity is biggest?",
    "What should Elevate360 launch next?",
  ];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; grounding: { opportunities: string[]; risks: string[]; actions: string[] } } | null>(null);

  const ask = useMutation({
    mutationFn: async (q: string) => {
      const r = await fetch("/api/admin/founder-intel/copilot", {
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
    <div className="space-y-4" data-testid="panel-intel-copilot">
      <form onSubmit={(e) => { e.preventDefault(); submit(question); }} className="flex gap-2">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask your founder copilot anything strategic…"
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
          <div className="flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4 text-[#F4A62A]" /><span className="text-sm font-semibold text-white">Copilot</span></div>
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
      const r = await fetch("/api/admin/founder-intel/reports", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data: Report) => { setOpenId(data.id); qc.invalidateQueries({ queryKey: ["/api/admin/founder-intel/overview"] }); },
  });

  const detail = useQuery<Report>({
    queryKey: ["/api/admin/founder-intel/reports", openId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/founder-intel/reports/${openId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: openId != null,
  });

  return (
    <div className="space-y-4" data-testid="panel-intel-reports">
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

export default function FounderIntelligence() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
