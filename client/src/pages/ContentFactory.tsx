import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, Eye, EyeOff, FileText, Lock, Loader2, Pencil, RefreshCw, Send,
  Sparkles, Trash2, X,
} from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Draft = {
  id: number;
  kind: "blog" | "social" | "newsletter";
  topic: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  status: "draft" | "approved" | "published" | "rejected";
  provider: string;
  publishedPostId: number | null;
  createdAt: string;
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
            <Lock className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Content Factory</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-factory-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-factory-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-factory-login" className="btn-primary w-full py-3">Access Content Factory</button>
        </form>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-white/10 text-white/70",
  approved: "bg-blue-500/20 text-blue-300",
  published: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-red-500/20 text-red-300",
};

function DraftCard({ draft, onLogout }: { draft: Draft; onLogout: () => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(draft.title);
  const [excerpt, setExcerpt] = useState(draft.excerpt);
  const [body, setBody] = useState(draft.body);

  const action = useMutation({
    mutationFn: async ({ path, method, payload }: { path: string; method: string; payload?: any }) => {
      const r = await fetch(path, {
        method, credentials: "include",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("Unauthorized"); }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Action failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/content-factory/drafts"] }),
  });

  const base = `/api/admin/content-factory/drafts/${draft.id}`;

  return (
    <div className="lux-card p-4" data-testid={`card-draft-${draft.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[draft.status]}`} data-testid={`status-draft-${draft.id}`}>{draft.status}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/50">{draft.kind}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/40">{draft.provider}</span>
          </div>
          {editing ? (
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-2" data-testid={`input-title-${draft.id}`} />
          ) : (
            <h3 className="text-white font-semibold leading-snug" data-testid={`text-title-${draft.id}`}>{draft.title}</h3>
          )}
          <p className="text-white/40 text-xs mt-0.5">Topic: {draft.topic}</p>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Excerpt" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" data-testid={`input-excerpt-${draft.id}`} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Body" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono" data-testid={`input-body-${draft.id}`} />
          <div className="flex gap-2">
            <button onClick={() => action.mutate({ path: base, method: "PATCH", payload: { title, excerpt, body } }, { onSuccess: () => setEditing(false) })} className="btn-primary text-xs px-3 py-1.5" data-testid={`button-save-${draft.id}`}>Save</button>
            <button onClick={() => { setEditing(false); setTitle(draft.title); setExcerpt(draft.excerpt); setBody(draft.body); }} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          {draft.excerpt && <p className="text-white/60 text-sm mt-2">{draft.excerpt}</p>}
          <button onClick={() => setExpanded(v => !v)} className="text-xs mt-2" style={{ color: GOLD }} data-testid={`button-toggle-body-${draft.id}`}>
            {expanded ? "Hide content" : "View content"}
          </button>
          {expanded && <pre className="text-white/70 text-xs mt-2 whitespace-pre-wrap font-sans border-t border-white/10 pt-2 max-h-72 overflow-auto">{draft.body}</pre>}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
        {draft.status !== "published" && (
          <button onClick={() => setEditing(v => !v)} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 flex items-center gap-1" data-testid={`button-edit-${draft.id}`}>
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
        {(draft.status === "draft") && (
          <button onClick={() => action.mutate({ path: `${base}/approve`, method: "POST" })} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 flex items-center gap-1" data-testid={`button-approve-${draft.id}`}>
            <Check className="h-3 w-3" /> Approve
          </button>
        )}
        {(draft.status === "approved") && (
          <button onClick={() => action.mutate({ path: `${base}/publish`, method: "POST" })} disabled={action.isPending} className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1" data-testid={`button-publish-${draft.id}`}>
            <Send className="h-3 w-3" /> Publish
          </button>
        )}
        {(draft.status === "draft" || draft.status === "approved") && (
          <button onClick={() => action.mutate({ path: `${base}/reject`, method: "POST" })} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 flex items-center gap-1" data-testid={`button-reject-${draft.id}`}>
            <X className="h-3 w-3" /> Reject
          </button>
        )}
        {draft.status === "published" && draft.kind === "blog" && (
          <span className="text-xs text-emerald-300/80">Live on /blog</span>
        )}
        <button onClick={() => { if (confirm("Delete this draft?")) action.mutate({ path: base, method: "DELETE" }); }} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-300 flex items-center gap-1 ml-auto" data-testid={`button-delete-${draft.id}`}>
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
      {action.isError && <p className="text-red-400 text-xs mt-2">{(action.error as Error).message}</p>}
    </div>
  );
}

function Console({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"blog" | "social" | "newsletter">("blog");
  const [premium, setPremium] = useState(false);
  const [topicsText, setTopicsText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: drafts = [], isLoading, refetch, isFetching } = useQuery<Draft[]>({
    queryKey: ["/api/admin/content-factory/drafts", statusFilter],
    queryFn: async () => {
      const url = statusFilter ? `/api/admin/content-factory/drafts?status=${statusFilter}` : "/api/admin/content-factory/drafts";
      const r = await fetch(url, { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("Unauthorized"); }
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const topics = topicsText.split("\n").map(t => t.trim()).filter(Boolean).slice(0, 8);
      if (topics.length === 0) throw new Error("Enter at least one topic.");
      const r = await fetch("/api/admin/content-factory/generate", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, topics, premium }),
      });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); onLogout(); throw new Error("Unauthorized"); }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Generation failed");
      return r.json();
    },
    onSuccess: () => { setTopicsText(""); qc.invalidateQueries({ queryKey: ["/api/admin/content-factory/drafts"] }); },
  });

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(220_50%_8%)]/85 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: GOLD }} />
            <h1 className="font-bold">AI Content Factory</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="text-white/50 hover:text-white p-2" data-testid="button-refresh-drafts">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onLogout} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70" data-testid="button-factory-logout">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <section className="lux-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4" style={{ color: GOLD }} /> Batch Generate</h2>
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="select-kind">
              <option value="blog">Blog post</option>
              <option value="social">Social post</option>
              <option value="newsletter">Newsletter</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} data-testid="checkbox-premium" />
              Premium (OpenAI)
            </label>
          </div>
          <textarea
            value={topicsText} onChange={(e) => setTopicsText(e.target.value)}
            rows={4} placeholder="One topic per line (max 8)&#10;e.g. How AI helps indie creators scale&#10;Behind the scenes of Bondedlove"
            className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-white/30"
            data-testid="input-topics"
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => generate.mutate()} disabled={generate.isPending} className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60" data-testid="button-generate">
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generate.isPending ? "Generating…" : "Generate Drafts"}
            </button>
            {generate.isError && <span className="text-red-400 text-sm">{(generate.error as Error).message}</span>}
            {generate.isSuccess && <span className="text-emerald-300 text-sm">Generated {generate.data?.generated} draft(s){generate.data?.failed?.length ? `, ${generate.data.failed.length} failed` : ""}.</span>}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Drafts</h2>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/6 border border-white/10 rounded-lg px-3 py-1.5 text-sm" data-testid="select-status-filter">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {isLoading ? (
            <div className="text-white/40 text-sm">Loading…</div>
          ) : drafts.length === 0 ? (
            <div className="lux-card p-8 text-center text-white/40 text-sm" data-testid="text-no-drafts">No drafts yet. Generate a batch above.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {drafts.map((d) => <DraftCard key={d.id} draft={d} onLogout={onLogout} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ContentFactory() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console onLogout={() => setAuthed(false)} />;
}
