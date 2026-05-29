import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, Loader2, Pencil, Plus, Trash2, X, ShoppingBag } from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  stripePriceId: string;
  deliveryType: "link" | "content";
  deliveryContent: string;
  featured: boolean;
  sortOrder: number;
  published: boolean;
};

type FormState = Omit<Product, "id">;

const EMPTY: FormState = {
  slug: "",
  name: "",
  description: "",
  category: "general",
  priceCents: 0,
  currency: "usd",
  imageUrl: "",
  stripePriceId: "",
  deliveryType: "link",
  deliveryContent: "",
  featured: false,
  sortOrder: 0,
  published: true,
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
          <h1 className="text-2xl font-bold text-white">Marketplace Manager</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Restricted</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-marketplace-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-marketplace-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-marketplace-login" className="btn-primary w-full py-3">Access Marketplace Manager</button>
        </form>
      </div>
    </div>
  );
}

function ProductForm({ initial, onClose }: { initial: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(initial ? { ...initial } : EMPTY);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (!payload.imageUrl) delete payload.imageUrl;
      const path = initial ? `/api/admin/marketplace/${initial.id}` : "/api/admin/marketplace";
      const r = await fetch(path, {
        method: initial ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Save failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/marketplace"] }); onClose(); },
    onError: (e: any) => setError(e.message),
  });

  const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const input = "w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30";

  return (
    <div className="lux-card space-y-3" data-testid="form-marketplace">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">{initial ? "Edit product" : "New product"}</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white" data-testid="button-marketplace-close"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="slug (lowercase-hyphen)" required
          data-testid="input-marketplace-slug" className={input} />
        <input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Category"
          data-testid="input-marketplace-category" className={input} />
      </div>
      <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Product name" required
        data-testid="input-marketplace-name" className={input} />
      <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Description" rows={3}
        data-testid="input-marketplace-description" className={input} />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm text-white/70">
          Price (cents)
          <input type="number" value={form.priceCents} onChange={(e) => set("priceCents", Number(e.target.value))}
            data-testid="input-marketplace-price" className={input} />
        </label>
        <input value={form.stripePriceId} onChange={(e) => set("stripePriceId", e.target.value)} placeholder="Stripe price ID (price_…)"
          data-testid="input-marketplace-stripe" className={input} />
      </div>
      <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="Image URL (https://…)"
        data-testid="input-marketplace-image" className={input} />
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={form.deliveryType} onChange={(e) => set("deliveryType", e.target.value)} data-testid="select-marketplace-delivery-type" className={input}>
          <option value="link" className="bg-[#0d1a2e]">Delivery: Download link</option>
          <option value="content" className="bg-[#0d1a2e]">Delivery: Unlocked text</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-white/70">
          Order
          <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))}
            data-testid="input-marketplace-order" className={input} />
        </label>
      </div>
      <textarea value={form.deliveryContent} onChange={(e) => set("deliveryContent", e.target.value)}
        placeholder={form.deliveryType === "link" ? "Delivery URL (https://…)" : "Delivered content / access details"} rows={2}
        data-testid="input-marketplace-delivery-content" className={input} />
      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} data-testid="checkbox-marketplace-featured" />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} data-testid="checkbox-marketplace-published" />
          Published
        </label>
      </div>
      {error && <p className="text-red-400 text-sm" data-testid="text-marketplace-form-error">{error}</p>}
      <button onClick={() => { setError(""); save.mutate(); }} disabled={save.isPending || !form.name || !form.slug}
        data-testid="button-marketplace-save" className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Save changes" : "Create product"}
      </button>
    </div>
  );
}

function Console() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/marketplace"],
    queryFn: async () => {
      const r = await fetch("/api/admin/marketplace", { credentials: "include" });
      if (r.status === 401) { sessionStorage.removeItem("e360_dashboard_auth"); window.location.reload(); }
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/marketplace/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/marketplace"] }),
  });

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <ShoppingBag className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Marketplace Manager</h1>
              <p className="text-white/40 text-xs">Digital products · Stripe checkout · instant delivery</p>
            </div>
          </div>
          <button onClick={() => { setEditing(null); setCreating(true); }} data-testid="button-marketplace-new"
            className="btn-primary px-4 py-2 flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> New</button>
        </div>

        {(creating || editing) && (
          <div className="mb-8">
            <ProductForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />
          </div>
        )}

        {isLoading ? (
          <p className="text-white/40" data-testid="text-marketplace-list-loading">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-white/40" data-testid="text-marketplace-list-empty">No products yet.</p>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} data-testid={`row-marketplace-${p.id}`} className="lux-card flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{p.category}</span>
                    {!p.published && <span className="text-[10px] text-white/40 border border-white/15 rounded px-1.5">Hidden</span>}
                    {p.featured && <span className="text-[10px] text-[#F4A62A] border border-[#F4A62A]/40 rounded px-1.5">Featured</span>}
                    {!p.stripePriceId && <span className="text-[10px] text-amber-300 border border-amber-300/30 rounded px-1.5">No Stripe price</span>}
                  </div>
                  <h3 className="font-semibold text-white mt-1 truncate" data-testid={`text-marketplace-row-name-${p.id}`}>{p.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">/{p.slug} · ${(p.priceCents / 100).toFixed(2)} · {p.deliveryType}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setCreating(false); setEditing(p); }} data-testid={`button-marketplace-edit-${p.id}`}
                    className="p-2 text-white/50 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del.mutate(p.id)} data-testid={`button-marketplace-delete-${p.id}`}
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

export default function MarketplaceAdmin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Console />;
}
