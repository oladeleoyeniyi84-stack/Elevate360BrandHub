import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Eye, EyeOff, Lock, Loader2, Search, Trash2, Plus, X,
  Activity, Database, Sparkles, Clock,
} from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

const SCOPES = ["conversation", "lead", "founder", "agent", "brand_knowledge"] as const;
const TYPES = ["short_term", "long_term", "episodic", "strategic"] as const;

type Memory = {
  id: number;
  memoryScope: string;
  memoryType: string;
  subjectKey: string;
  title: string | null;
  content: string;
  importance: number;
  source: string;
  accessCount: number;
  lastAccessedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  similarity?: number;
};

type Overview = {
  health: {
    total: number;
    embedded: number;
    embeddingCoverage: number;
    staleExpired: number;
    byScope: { scope: string; count: number }[];
    byType: { type: string; count: number }[];
  };
  analytics: {
    topAccessed: { id: number; scope: string; subjectKey: string; title: string | null; accessCount: number }[];
    recent: { id: number; scope: string; type: string; subjectKey: string; title: string | null; createdAt: string }[];
    importance: { avg: number; max: number; min: number };
    bySource: { source: string; count: number }[];
  };
};

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
          <h1 className="text-2xl font-bold text-white">Cognitive Memory</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-memory-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-memory-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-memory-login" className="btn-primary w-full py-3">Access Memory Explorer</button>
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

function MemoryRow({ m, onDelete }: { m: Memory; onDelete: (id: number) => void }) {
  return (
    <div className="lux-card flex items-start justify-between gap-4" data-testid={`row-memory-${m.id}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{m.memoryScope}</span>
          <span className="text-[10px] text-white/40 border border-white/15 rounded px-1.5">{m.memoryType}</span>
          <span className="text-[10px] text-white/40">imp {m.importance}</span>
          {typeof m.similarity === "number" && (
            <span className="text-[10px] text-emerald-300 border border-emerald-300/30 rounded px-1.5">{Math.round(m.similarity * 100)}% match</span>
          )}
        </div>
        {m.title && <h3 className="font-semibold text-white mt-1 truncate" data-testid={`text-memory-title-${m.id}`}>{m.title}</h3>}
        <p className="text-sm text-white/60 mt-1 line-clamp-3">{m.content}</p>
        <p className="text-[11px] text-white/35 mt-1.5">subject: {m.subjectKey} · src: {m.source} · accessed {m.accessCount}×</p>
      </div>
      <button onClick={() => onDelete(m.id)} data-testid={`button-memory-delete-${m.id}`} className="p-2 text-white/50 hover:text-red-400 shrink-0">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function Console() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "search" | "explorer" | "add">("overview");
  const [q, setQ] = useState("");
  const [searchScope, setSearchScope] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [listScope, setListScope] = useState("");

  const overview = useQuery<Overview>({
    queryKey: ["/api/admin/memory/overview"],
    queryFn: async () => {
      const r = await fetch("/api/admin/memory/overview", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); window.location.reload(); }
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const search = useQuery<Memory[]>({
    queryKey: ["/api/admin/memory/search", activeQuery, searchScope],
    queryFn: async () => {
      const params = new URLSearchParams({ q: activeQuery });
      if (searchScope) params.set("scope", searchScope);
      const r = await fetch(`/api/admin/memory/search?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: tab === "search" && activeQuery.length > 0,
  });

  const list = useQuery<Memory[]>({
    queryKey: ["/api/admin/memory/list", listScope],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (listScope) params.set("scope", listScope);
      const r = await fetch(`/api/admin/memory/list?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: tab === "explorer",
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/memory/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/memory/list"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/memory/search"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/memory/overview"] });
    },
  });

  const prune = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/memory/prune", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Prune failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/memory/overview"] }),
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "search", label: "Search" },
    { id: "explorer", label: "Explorer" },
    { id: "add", label: "Add" },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <Brain className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cognitive Memory</h1>
              <p className="text-white/40 text-xs">Phase 63 · pgvector semantic memory</p>
            </div>
          </div>
          <button onClick={() => prune.mutate()} disabled={prune.isPending} data-testid="button-memory-prune"
            className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
            {prune.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />} Prune expired
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/8">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-memory-${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t.id ? "border-[#F4A62A] text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-5" data-testid="panel-memory-overview">
            {overview.isLoading ? <p className="text-white/40">Loading…</p> : overview.data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat icon={Database} label="Total" value={overview.data.health.total} />
                  <Stat icon={Sparkles} label="Embedded" value={`${overview.data.health.embeddingCoverage}%`} />
                  <Stat icon={Activity} label="Avg importance" value={overview.data.analytics.importance.avg ?? 0} />
                  <Stat icon={Clock} label="Stale" value={overview.data.health.staleExpired} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="lux-card">
                    <h3 className="text-sm font-semibold text-white mb-3">By scope</h3>
                    {overview.data.health.byScope.length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                      overview.data.health.byScope.map((s) => (
                        <div key={s.scope} className="flex justify-between text-sm py-1" data-testid={`stat-scope-${s.scope}`}>
                          <span className="text-white/60">{s.scope}</span><span className="text-white font-medium">{s.count}</span>
                        </div>
                      ))}
                  </div>
                  <div className="lux-card">
                    <h3 className="text-sm font-semibold text-white mb-3">By type</h3>
                    {overview.data.health.byType.length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                      overview.data.health.byType.map((s) => (
                        <div key={s.type} className="flex justify-between text-sm py-1" data-testid={`stat-type-${s.type}`}>
                          <span className="text-white/60">{s.type}</span><span className="text-white font-medium">{s.count}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="lux-card">
                  <h3 className="text-sm font-semibold text-white mb-3">Most accessed</h3>
                  {overview.data.analytics.topAccessed.length === 0 ? <p className="text-white/40 text-sm">None yet.</p> :
                    overview.data.analytics.topAccessed.map((m) => (
                      <div key={m.id} className="flex justify-between text-sm py-1">
                        <span className="text-white/60 truncate">{m.title || m.subjectKey} <span className="text-white/30">({m.scope})</span></span>
                        <span className="text-white font-medium ml-3">{m.accessCount}×</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "search" && (
          <div className="space-y-4" data-testid="panel-memory-search">
            <form onSubmit={(e) => { e.preventDefault(); setActiveQuery(q.trim()); }} className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Semantic search across all memories…"
                data-testid="input-memory-search" className="flex-1 bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30" />
              <select value={searchScope} onChange={(e) => setSearchScope(e.target.value)} data-testid="select-memory-search-scope"
                className="bg-white/6 border border-white/10 rounded-lg px-3 text-white">
                <option value="" className="bg-[#0d1a2e]">All scopes</option>
                {SCOPES.map((s) => <option key={s} value={s} className="bg-[#0d1a2e]">{s}</option>)}
              </select>
              <button type="submit" data-testid="button-memory-search" className="btn-primary px-4 flex items-center gap-2"><Search className="h-4 w-4" /></button>
            </form>
            {search.isFetching ? <p className="text-white/40">Searching…</p> :
              activeQuery && (search.data?.length ?? 0) === 0 ? <p className="text-white/40" data-testid="text-search-empty">No matches.</p> :
              <div className="space-y-3">{search.data?.map((m) => <MemoryRow key={m.id} m={m} onDelete={del.mutate} />)}</div>}
          </div>
        )}

        {tab === "explorer" && (
          <div className="space-y-4" data-testid="panel-memory-explorer">
            <select value={listScope} onChange={(e) => setListScope(e.target.value)} data-testid="select-memory-list-scope"
              className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white">
              <option value="" className="bg-[#0d1a2e]">All scopes</option>
              {SCOPES.map((s) => <option key={s} value={s} className="bg-[#0d1a2e]">{s}</option>)}
            </select>
            {list.isLoading ? <p className="text-white/40">Loading…</p> :
              (list.data?.length ?? 0) === 0 ? <p className="text-white/40" data-testid="text-list-empty">No memories yet.</p> :
              <div className="space-y-3">{list.data?.map((m) => <MemoryRow key={m.id} m={m} onDelete={del.mutate} />)}</div>}
          </div>
        )}

        {tab === "add" && <AddMemory onDone={() => { qc.invalidateQueries({ queryKey: ["/api/admin/memory/overview"] }); setTab("explorer"); }} />}
      </div>
    </div>
  );
}

function AddMemory({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    memoryScope: "founder", memoryType: "strategic", subjectKey: "founder",
    title: "", content: "", importance: 70, source: "founder",
  });
  const [error, setError] = useState("");
  const input = "w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30";
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/memory", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Save failed");
      return r.json();
    },
    onSuccess: onDone,
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="lux-card space-y-3" data-testid="form-memory-add">
      <h3 className="font-bold text-white">Add founder memory</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={form.memoryScope} onChange={(e) => set("memoryScope", e.target.value)} data-testid="select-add-scope" className={input}>
          {SCOPES.map((s) => <option key={s} value={s} className="bg-[#0d1a2e]">{s}</option>)}
        </select>
        <select value={form.memoryType} onChange={(e) => set("memoryType", e.target.value)} data-testid="select-add-type" className={input}>
          {TYPES.map((s) => <option key={s} value={s} className="bg-[#0d1a2e]">{s}</option>)}
        </select>
      </div>
      <input value={form.subjectKey} onChange={(e) => set("subjectKey", e.target.value)} placeholder="Subject key (e.g. founder, brand)"
        data-testid="input-add-subject" className={input} />
      <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Title (optional)"
        data-testid="input-add-title" className={input} />
      <textarea value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Memory content" rows={4}
        data-testid="input-add-content" className={input} />
      <label className="flex items-center gap-3 text-sm text-white/70">
        Importance: {form.importance}
        <input type="range" min={0} max={100} value={form.importance} onChange={(e) => set("importance", Number(e.target.value))}
          data-testid="input-add-importance" className="flex-1" />
      </label>
      {error && <p className="text-red-400 text-sm" data-testid="text-add-error">{error}</p>}
      <button onClick={() => { setError(""); save.mutate(); }} disabled={save.isPending || !form.content}
        data-testid="button-add-save" className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Store memory
      </button>
    </div>
  );
}

export default function MemoryExplorer() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
