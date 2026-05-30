import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Eye, EyeOff, Loader2, RefreshCw, Activity, GitMerge, Layers,
  AlertTriangle, Lightbulb, Target, FileText,
} from "lucide-react";
import { cognitiveApi } from "@/api/admin";
import { BriefingCard } from "@/components/cognitive/BriefingCard";
import { DecisionTable } from "@/components/cognitive/DecisionTable";
import { ConflictPanel } from "@/components/cognitive/ConflictPanel";
import type { CognitiveOverview, CognitiveBriefing } from "@shared/types/cognitive";

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
            <Brain className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Cognitive OS</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-cognitive-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-cognitive-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-cognitive-login" className="btn-primary w-full py-3">Access Cognitive OS</button>
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

type TabId = "briefing" | "decisions" | "conflicts" | "signals" | "systems" | "briefings";

const TABS: { id: TabId; label: string }[] = [
  { id: "briefing", label: "Briefing" },
  { id: "decisions", label: "Decisions" },
  { id: "conflicts", label: "Conflicts" },
  { id: "signals", label: "Signals" },
  { id: "systems", label: "Systems" },
  { id: "briefings", label: "History" },
];

function Console() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("briefing");

  const overview = useQuery<CognitiveOverview>({ queryKey: ["cognitive-overview"], queryFn: cognitiveApi.overview });
  const signals = useQuery({ queryKey: ["cognitive-signals"], queryFn: cognitiveApi.signals, enabled: tab === "signals" });
  const briefings = useQuery<CognitiveBriefing[]>({ queryKey: ["cognitive-briefings"], queryFn: () => cognitiveApi.briefings(), enabled: tab === "briefings" || tab === "briefing" });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["cognitive-overview"] });
    qc.invalidateQueries({ queryKey: ["cognitive-signals"] });
    qc.invalidateQueries({ queryKey: ["cognitive-briefings"] });
  };

  const runScan = useMutation({ mutationFn: cognitiveApi.run, onSuccess: invalidateAll });
  const decisionStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => cognitiveApi.setDecisionStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cognitive-overview"] }),
  });
  const conflictStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => cognitiveApi.setConflictStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cognitive-overview"] }),
  });

  const data = overview.data;
  const totals = data?.totals;
  const latestBriefing = briefings.data?.[0];

  const allDecisions = data ? [...data.decisions.risks, ...data.decisions.opportunities, ...data.decisions.actions] : [];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <Brain className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cognitive Operating System</h1>
              <p className="text-white/50 text-xs">Unifying Founder · Revenue · Growth intelligence into one mind</p>
            </div>
          </div>
          <button
            onClick={() => runScan.mutate()} disabled={runScan.isPending}
            data-testid="button-run-scan"
            className="btn-primary px-4 py-2.5 flex items-center gap-2 disabled:opacity-60"
          >
            {runScan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Cognitive Scan
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat icon={Activity} label="Open Signals" value={totals?.signals ?? "—"} />
          <Stat icon={Layers} label="Decisions" value={totals?.decisions ?? "—"} />
          <Stat icon={GitMerge} label="Conflicts" value={totals?.conflicts ?? "—"} />
          <Stat icon={Brain} label="Cognitive Load" value={totals?.cognitiveLoad ?? "—"} />
        </div>

        <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-cognitive-${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t.id ? "border-[#F4A62A] text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {overview.isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>}

        {tab === "briefing" && (
          <BriefingCard briefing={latestBriefing} />
        )}

        {tab === "decisions" && (
          <DecisionTable decisions={allDecisions} onStatus={(id, status) => decisionStatus.mutate({ id, status })} />
        )}

        {tab === "conflicts" && data && (
          <ConflictPanel conflicts={data.conflicts} onStatus={(id, status) => conflictStatus.mutate({ id, status })} />
        )}

        {tab === "signals" && (
          <div className="space-y-2">
            {signals.isLoading && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>}
            {(signals.data?.signals ?? []).map((s, i) => (
              <div key={i} className="lux-card flex items-start justify-between gap-3" data-testid={`row-signal-${i}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{s.system}</span>
                    <span className="text-[10px] text-white/40">{s.area}</span>
                    <span className="text-[10px] text-white/40">{s.kind}</span>
                  </div>
                  <p className="text-sm text-white mt-1">{s.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black" style={{ color: GOLD }}>{s.score}</div>
                  <div className="text-[10px] text-white/40">score</div>
                </div>
              </div>
            ))}
            {signals.data && signals.data.signals.length === 0 && (
              <div className="lux-card"><p className="text-white/50 text-sm">No open signals from any subsystem right now.</p></div>
            )}
          </div>
        )}

        {tab === "systems" && data && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.systems.map((s) => (
              <div key={s.system} className="lux-card" data-testid={`card-system-${s.system}`}>
                <h3 className="font-bold text-white capitalize">{s.system}</h3>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-white/55">Signals</span><span className="text-white font-medium">{s.signals}</span></div>
                  <div className="flex justify-between"><span className="text-white/55">Avg priority</span><span className="text-white font-medium">{s.avgPriority}</span></div>
                  <div className="flex justify-between"><span className="text-white/55">Avg confidence</span><span className="text-white font-medium">{s.avgConfidence}%</span></div>
                  <div className="flex justify-between"><span className="text-white/55">Top area</span><span className="text-[#F4A62A] font-medium">{s.topArea ?? "—"}</span></div>
                </div>
              </div>
            ))}
            {data.systems.length === 0 && <div className="lux-card"><p className="text-white/50 text-sm">No active subsystems reporting signals.</p></div>}
          </div>
        )}

        {tab === "briefings" && (
          <div className="space-y-3">
            {(briefings.data ?? []).map((b) => (
              <div key={b.id} className="lux-card" data-testid={`row-briefing-${b.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#F4A62A]" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{b.periodType}</span>
                    <span className="text-sm text-white">{b.title}</span>
                  </div>
                  <span className="text-[11px] text-white/40">{new Date(b.createdAt as any).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-white/60 mt-2 line-clamp-3 whitespace-pre-line">{b.summary}</p>
              </div>
            ))}
            {briefings.data && briefings.data.length === 0 && (
              <div className="lux-card"><p className="text-white/50 text-sm">No briefings yet. Run a scan to generate one.</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CognitiveOS() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
