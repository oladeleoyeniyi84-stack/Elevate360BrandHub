import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Lock, Users, MessageSquare, Mail, TrendingUp,
  Eye, EyeOff, LogOut, Sparkles, Wand2, Copy, Check,
  Instagram, Newspaper, Twitter, Youtube, Package,
  BookOpen, Music, FileText, AtSign, PenLine, ChevronDown, ChevronUp,
  BarChart3,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

function downloadCSV(filename: string, rows: string[][]): void {
  const escape = (v: string) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={`button-export-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#F4A62A]/30 text-[#F4A62A] hover:bg-[#F4A62A]/10 transition"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      {label}
    </button>
  );
}

interface Lead {
  id: number;
  sessionId: string;
  leadName: string | null;
  leadEmail: string | null;
  messages: { role: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribedAt: string;
}

type ContentType =
  | "instagram_caption" | "newsletter" | "tweet" | "youtube_description"
  | "product_description" | "book_promo" | "music_release" | "press_release"
  | "email_subject_lines" | "blog_intro";

const CONTENT_TYPES: { key: ContentType; label: string; icon: React.ElementType; placeholder: string }[] = [
  { key: "instagram_caption", label: "Instagram Caption", icon: Instagram, placeholder: "e.g. Announcing Bondedlove app — the dating app for real connections" },
  { key: "newsletter", label: "Newsletter Email", icon: Newspaper, placeholder: "e.g. Monthly update about new app features and book releases" },
  { key: "tweet", label: "Tweets / X Posts", icon: Twitter, placeholder: "e.g. Promote the Healthwise: Stay Healthy book for wellness readers" },
  { key: "youtube_description", label: "YouTube Description", icon: Youtube, placeholder: "e.g. Tutorial video showing how to use Video Crafter to edit reels" },
  { key: "product_description", label: "Product Description", icon: Package, placeholder: "e.g. Description for Healthwisesupport app on the App Store" },
  { key: "book_promo", label: "Book Promo Post", icon: BookOpen, placeholder: "e.g. Promo post for 'Together: Let There Be Love' targeting couples" },
  { key: "music_release", label: "Music Release Post", icon: Music, placeholder: "e.g. Announcing a new Afrobeat track on Audiomack" },
  { key: "press_release", label: "Press Release", icon: FileText, placeholder: "e.g. Announcing the launch of the Bondedlove dating app" },
  { key: "email_subject_lines", label: "Email Subject Lines", icon: AtSign, placeholder: "e.g. Newsletter promoting the new book collection" },
  { key: "blog_intro", label: "Blog Post Intro", icon: PenLine, placeholder: "e.g. Blog post about how wellness apps are transforming healthcare" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByDay(dates: string[], days = 30): { date: string; count: number }[] {
  const now = new Date();
  const result: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayStr = d.toISOString().split("T")[0];
    const count = dates.filter((dt) => dt.startsWith(dayStr)).length;
    result.push({ date: label, count });
  }

  return result;
}

function cumulativeByDay(dates: string[], days = 30): { date: string; total: number }[] {
  const allDates = dates.map((d) => d.split("T")[0]).sort();
  const now = new Date();
  const result: { date: string; total: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const total = allDates.filter((dt) => dt <= dayStr).length;
    result.push({ date: label, total });
  }

  return result;
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(220 50% 13%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "white",
    fontSize: "12px",
  },
  itemStyle: { color: "#F4A62A" },
  labelStyle: { color: "rgba(255,255,255,0.5)" },
};

function Analytics({
  leads, contacts, subscribers,
}: {
  leads: Lead[];
  contacts: ContactMessage[];
  subscribers: NewsletterSubscriber[];
}) {
  const capturedLeads = leads.filter((l) => l.leadEmail);
  const activeLeads = leads.filter((l) => (l.messages as any[]).length > 0);

  const chatByDay = groupByDay(leads.map((l) => l.createdAt));
  const subCumulative = cumulativeByDay(subscribers.map((s) => s.subscribedAt));
  const contactByDay = groupByDay(contacts.map((c) => c.createdAt));

  const funnelData = [
    { stage: "Chat Sessions", value: leads.length, fill: "#F4A62A" },
    { stage: "Had Conversation", value: activeLeads.length, fill: "#fb923c" },
    { stage: "Email Captured", value: capturedLeads.length, fill: "#22c55e" },
  ];

  const captureRate = leads.length > 0
    ? Math.round((capturedLeads.length / leads.length) * 100)
    : 0;

  return (
    <div className="space-y-6">

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Lead Capture Rate", value: `${captureRate}%`, sub: "of all chat sessions", color: "#22c55e" },
          { label: "Avg Messages/Chat", value: leads.length > 0 ? (leads.reduce((s, l) => s + ((l.messages as any[]).length), 0) / leads.length).toFixed(1) : "0", sub: "messages per session", color: "#F4A62A" },
          { label: "Newsletter Total", value: subscribers.length, sub: "all-time subscribers", color: "#38bdf8" },
          { label: "Contact Forms", value: contacts.length, sub: "all-time submissions", color: "#a78bfa" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="lux-card">
            <p className="text-2xl font-bold font-heading" style={{ color }}>{value}</p>
            <p className="text-white text-sm font-medium mt-0.5">{label}</p>
            <p className="text-white/30 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Lead Funnel */}
      <div className="lux-card">
        <h3 className="text-sm font-semibold text-white/70 mb-5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#F4A62A]" />
          Lead Conversion Funnel
        </h3>
        {leads.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No data yet — start getting visitors!</p>
        ) : (
          <div className="space-y-3">
            {funnelData.map(({ stage, value, fill }) => {
              const pct = leads.length > 0 ? Math.round((value / leads.length) * 100) : 0;
              return (
                <div key={stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{stage}</span>
                    <span className="font-semibold" style={{ color: fill }}>{value} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/6 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Sessions Over Time */}
      <div className="lux-card">
        <h3 className="text-sm font-semibold text-white/70 mb-5 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#F4A62A]" />
          Chat Sessions — Last 30 Days
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chatByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              tickLine={false}
              interval={6}
            />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} allowDecimals={false} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Sessions" fill="#F4A62A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Newsletter Growth */}
      <div className="lux-card">
        <h3 className="text-sm font-semibold text-white/70 mb-5 flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#38bdf8]" />
          Newsletter Subscribers — Cumulative Growth
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={subCumulative} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              tickLine={false}
              interval={6}
            />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} allowDecimals={false} />
            <Tooltip {...CHART_TOOLTIP_STYLE} itemStyle={{ color: "#38bdf8" }} />
            <Area
              type="monotone"
              dataKey="total"
              name="Subscribers"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#subGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Contact Forms Over Time */}
      <div className="lux-card">
        <h3 className="text-sm font-semibold text-white/70 mb-5 flex items-center gap-2">
          <Users className="h-4 w-4 text-[#a78bfa]" />
          Contact Form Submissions — Last 30 Days
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={contactByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              tickLine={false}
              interval={6}
            />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} allowDecimals={false} />
            <Tooltip {...CHART_TOOLTIP_STYLE} itemStyle={{ color: "#a78bfa" }} />
            <Line
              type="monotone"
              dataKey="count"
              name="Submissions"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#a78bfa" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

function PinLogin({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/dashboard/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      onLogin();
    } else {
      setError("Invalid PIN. Please try again.");
      setPin("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "hsl(220 50% 8%)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#F4A62A] flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">Creator Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Private Access</p>
        </div>
        <form onSubmit={handleSubmit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-dashboard-pin"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              autoFocus
              required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-dashboard-login" className="btn-primary w-full py-3">
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "#F4A62A" }: {
  label: string; value: number; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="lux-card flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white font-heading">{value}</p>
        <p className="text-white/50 text-sm">{label}</p>
      </div>
    </div>
  );
}

function ChatLeadRow({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false);
  const msgCount = lead.messages?.length ?? 0;

  return (
    <div className="border border-white/8 rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/4 transition text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#F4A62A]/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-[#F4A62A]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {lead.leadName || <span className="text-white/40 font-normal italic">Anonymous</span>}
            </p>
            <p className="text-xs text-white/40 truncate">
              {lead.leadEmail || "No email captured"} · {msgCount} messages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <span className="text-xs text-white/30 hidden sm:block">{formatDate(lead.updatedAt)}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
        </div>
      </button>
      {expanded && msgCount > 0 && (
        <div className="px-5 pb-4 space-y-2 border-t border-white/6 pt-3">
          {(lead.messages as { role: string; content: string }[]).map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user" ? "bg-[#F4A62A]/20 text-[#F4A62A]" : "bg-white/6 text-white/70"}`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BrandVoiceGenerator() {
  const [contentType, setContentType] = useState<ContentType>("instagram_caption");
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const selected = CONTENT_TYPES.find((c) => c.key === contentType)!;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, brief }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Generation failed");
      }
      return res.json() as Promise<{ copy: string }>;
    },
    onSuccess: ({ copy }) => {
      setResult(copy);
      setCopied(false);
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="lux-card space-y-5">
        <div>
          <label className="text-sm font-semibold text-white/70 block mb-3">Content Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CONTENT_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                data-testid={`button-content-type-${key}`}
                onClick={() => { setContentType(key); setResult(""); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                  contentType === key
                    ? "bg-[#F4A62A] text-black border-[#F4A62A]"
                    : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-white/70 block mb-2">
            Brief — tell the AI what to write
          </label>
          <textarea
            data-testid="input-voice-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder={selected.placeholder}
            className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 resize-none"
          />
        </div>

        <button
          data-testid="button-generate-copy"
          onClick={() => generateMutation.mutate()}
          disabled={!brief.trim() || generateMutation.isPending}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Wand2 className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          {generateMutation.isPending ? "Generating…" : "Generate Copy"}
        </button>

        {generateMutation.isError && (
          <p className="text-red-400 text-sm text-center">
            {(generateMutation.error as Error)?.message || "Something went wrong."}
          </p>
        )}
      </div>

      {result && (
        <div className="lux-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F4A62A]" />
              Generated Copy
            </p>
            <button
              data-testid="button-copy-result"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div
            data-testid="text-generated-copy"
            className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed bg-white/4 rounded-xl px-4 py-4 border border-white/6"
          >
            {result}
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"analytics" | "voice" | "leads" | "contacts" | "newsletter">("analytics");

  const leadsQuery = useQuery<Lead[]>({
    queryKey: ["/api/dashboard/leads"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/leads");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const contactsQuery = useQuery<ContactMessage[]>({
    queryKey: ["/api/dashboard/contacts"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/contacts");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const subscribersQuery = useQuery<NewsletterSubscriber[]>({
    queryKey: ["/api/dashboard/subscribers"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/subscribers");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const leads = leadsQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];
  const subscribers = subscribersQuery.data ?? [];
  const capturedLeads = leads.filter((l) => l.leadEmail);

  const tabs = [
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "voice", label: "Brand Voice", icon: Wand2 },
    { key: "leads", label: "Chat Leads", icon: MessageSquare },
    { key: "contacts", label: "Contacts", icon: Users },
    { key: "newsletter", label: "Newsletter", icon: Mail },
  ] as const;

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "hsl(220 50% 8%)" }}>
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white font-heading">Creator Dashboard</h1>
            <p className="text-white/40 text-sm mt-0.5">Elevate360Official · Analytics & Tools</p>
          </div>
          <button onClick={onLogout} data-testid="button-dashboard-logout"
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Chat Sessions" value={leads.length} icon={MessageSquare} />
          <StatCard label="Leads Captured" value={capturedLeads.length} icon={TrendingUp} color="#22c55e" />
          <StatCard label="Contact Forms" value={contacts.length} icon={Users} color="#a78bfa" />
          <StatCard label="Newsletter" value={subscribers.length} icon={Mail} color="#38bdf8" />
        </div>

        <div className="flex gap-1 bg-white/4 rounded-2xl p-1 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              data-testid={`button-tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 flex-shrink-0 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                tab === key ? "bg-[#F4A62A] text-black" : "text-white/50 hover:text-white/80"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "analytics" && (
          <Analytics leads={leads} contacts={contacts} subscribers={subscribers} />
        )}

        {tab === "voice" && <BrandVoiceGenerator />}

        {tab === "leads" && (
          <div className="space-y-3">
            {leads.length > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-white/40">{leads.length} session{leads.length !== 1 ? "s" : ""} · {capturedLeads.length} with email</p>
                <ExportButton
                  label="Export Leads CSV"
                  onClick={() => {
                    const rows = [
                      ["Name", "Email", "Messages", "Session ID", "Captured Date"],
                      ...capturedLeads.map((l) => [
                        l.leadName ?? "",
                        l.leadEmail ?? "",
                        String((l.messages as any[]).length),
                        l.sessionId,
                        new Date(l.updatedAt).toISOString().split("T")[0],
                      ]),
                    ];
                    downloadCSV(`elevate360-leads-${new Date().toISOString().split("T")[0]}.csv`, rows);
                  }}
                />
              </div>
            )}
            {leads.length === 0 ? (
              <div className="lux-card text-center py-10">
                <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No chat sessions yet</p>
              </div>
            ) : (
              leads.map((lead) => <ChatLeadRow key={lead.id} lead={lead} />)
            )}
          </div>
        )}

        {tab === "contacts" && (
          <div className="space-y-3">
            {contacts.length > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-white/40">{contacts.length} submission{contacts.length !== 1 ? "s" : ""}</p>
                <ExportButton
                  label="Export Contacts CSV"
                  onClick={() => {
                    const rows = [
                      ["Name", "Email", "Message", "Date"],
                      ...contacts.map((c) => [
                        c.name,
                        c.email,
                        c.message,
                        new Date(c.createdAt).toISOString().split("T")[0],
                      ]),
                    ];
                    downloadCSV(`elevate360-contacts-${new Date().toISOString().split("T")[0]}.csv`, rows);
                  }}
                />
              </div>
            )}
            {contacts.length === 0 ? (
              <div className="lux-card text-center py-10">
                <Users className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No contact form submissions yet</p>
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="lux-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-white/40">{c.email}</p>
                    </div>
                    <span className="text-xs text-white/30">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed border-t border-white/6 pt-2">{c.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "newsletter" && (
          <div className="space-y-2">
            {subscribers.length > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-white/40">{subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}</p>
                <ExportButton
                  label="Export Subscribers CSV"
                  onClick={() => {
                    const rows = [
                      ["Email", "Subscribed Date"],
                      ...subscribers.map((s) => [
                        s.email,
                        new Date(s.subscribedAt).toISOString().split("T")[0],
                      ]),
                    ];
                    downloadCSV(`elevate360-subscribers-${new Date().toISOString().split("T")[0]}.csv`, rows);
                  }}
                />
              </div>
            )}
            {subscribers.length === 0 ? (
              <div className="lux-card text-center py-10">
                <Mail className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No newsletter subscribers yet</p>
              </div>
            ) : (
              subscribers.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 border border-white/8 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#38bdf8]/15 flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5 text-[#38bdf8]" />
                    </div>
                    <p className="text-sm text-white/80">{s.email}</p>
                  </div>
                  <span className="text-xs text-white/30">{formatDate(s.subscribedAt)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem("e360_dashboard_auth") === "true";
  });

  const handleLogin = () => {
    sessionStorage.setItem("e360_dashboard_auth", "true");
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("e360_dashboard_auth");
    setAuthed(false);
  };

  if (!authed) return <PinLogin onLogin={handleLogin} />;
  return <DashboardContent onLogout={handleLogout} />;
}
