import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, Loader2, Pencil, Plus, Trash2, X, Award } from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type AuthorityItem = {
  id: number;
  type: "media_feature" | "milestone" | "credential" | "award" | "press";
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl: string;
  dateLabel: string;
  featured: boolean;
  sortOrder: number;
  published: boolean;
};

type FormState = {
  type: AuthorityItem["type"];
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl: string;
  dateLabel: string;
  featured: boolean;
  sortOrder: number;
  published: boolean;
};

const EMPTY: FormState = {
  type: "media_feature",
  title: "",
  description: "",
  source: "",
  url: "",
  imageUrl: "",
  dateLabel: "",
  featured: false,
  sortOrder: 0,
  published: true,
};

const TYPES: { value: AuthorityItem["type"]; label: string }[] = [
  { value: "media_feature", label: "Media Feature" },
  { value: "press", label: "Press" },
  { value: "award", label: "Award" },
  { value: "credential", label: "Credential" },
  { value: "milestone", label: "Milestone" },
];

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
          <h1 className="text-2xl font-bold text-white">Authority Manager</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-authority-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-authority-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-authority-login" className="btn-primary w-full py-3">Access Authority Manager</button>
        </form>
      </div>
    </div>
  );
}

function ItemForm({ initial, onClose }: { initial: AuthorityItem | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          type: initial.type,
          title: initial.title,
          description: initial.description,
          source: initial.source,
          url: initial.url,
          imageUrl: initial.imageUrl,
          dateLabel: initial.dateLabel,
          featured: initial.featured,
          sortOrder: initial.sortOrder,
          published: initial.published,
        }
      : EMPTY,
  );
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      // Omit empty optional URLs so Zod url() doesn't reject "".
      if (!payload.url) delete payload.url;
      if (!payload.imageUrl) delete payload.imageUrl;
      const path = initial ? `/api/admin/authority/${initial.id}` : "/api/admin/authority";
      const r = await fetch(path, {
        method: initial ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Save failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/authority"] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="lux-card space-y-4" data-testid="form-authority">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">{initial ? "Edit item" : "New item"}</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white" data-testid="button-authority-close"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={form.type} onChange={(e) => set("type", e.target.value)} data-testid="select-authority-type"
          className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white">
          {TYPES.map((t) => <option key={t.value} value={t.value} className="bg-[#0d1a2e]">{t.label}</option>)}
        </select>
        <input value={form.dateLabel} onChange={(e) => set("dateLabel", e.target.value)} placeholder="Date label (e.g. Mar 2026)"
          data-testid="input-authority-date" className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30" />
      </div>
      <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" required
        data-testid="input-authority-title" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30" />
      <input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="Source / publisher"
        data-testid="input-authority-source" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30" />
      <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Description" rows={3}
        data-testid="input-authority-description" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30" />
      <input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="Source URL (https://…)"
        data-testid="input-authority-url" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30" />
      <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="Image URL (https://…)"
        data-testid="input-authority-image" className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30" />
      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} data-testid="checkbox-authority-featured" />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} data-testid="checkbox-authority-published" />
          Published
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          Order
          <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} data-testid="input-authority-order"
            className="w-20 bg-white/6 border border-white/10 rounded-lg px-2 py-1 text-white" />
        </label>
      </div>
      {error && <p className="text-red-400 text-sm" data-testid="text-authority-form-error">{error}</p>}
      <button onClick={() => { setError(""); save.mutate(); }} disabled={save.isPending || !form.title}
        data-testid="button-authority-save" className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Save changes" : "Create item"}
      </button>
    </div>
  );
}

function Console() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AuthorityItem | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: items = [], isLoading } = useQuery<AuthorityItem[]>({
    queryKey: ["/api/admin/authority"],
    queryFn: async () => {
      const r = await fetch("/api/admin/authority", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); window.location.reload(); }
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/authority/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/authority"] }),
  });

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <Award className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Authority Manager</h1>
              <p className="text-white/40 text-xs">Media features · awards · credentials · milestones</p>
            </div>
          </div>
          <button onClick={() => { setEditing(null); setCreating(true); }} data-testid="button-authority-new"
            className="btn-primary px-4 py-2 flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> New</button>
        </div>

        {(creating || editing) && (
          <div className="mb-8">
            <ItemForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />
          </div>
        )}

        {isLoading ? (
          <p className="text-white/40" data-testid="text-authority-list-loading">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-white/40" data-testid="text-authority-list-empty">No authority items yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} data-testid={`row-authority-${item.id}`} className="lux-card flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{item.type.replace("_", " ")}</span>
                    {!item.published && <span className="text-[10px] text-white/40 border border-white/15 rounded px-1.5">Hidden</span>}
                    {item.featured && <span className="text-[10px] text-[#F4A62A] border border-[#F4A62A]/40 rounded px-1.5">Featured</span>}
                  </div>
                  <h3 className="font-semibold text-white mt-1 truncate" data-testid={`text-authority-row-title-${item.id}`}>{item.title}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{[item.source, item.dateLabel].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setCreating(false); setEditing(item); }} data-testid={`button-authority-edit-${item.id}`}
                    className="p-2 text-white/50 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del.mutate(item.id)} data-testid={`button-authority-delete-${item.id}`}
                    className="p-2 text-white/50 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthorityAdmin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
