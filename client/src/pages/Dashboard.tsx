import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Users, MessageSquare, Mail, TrendingUp, Eye, EyeOff, LogOut, Sparkles } from "lucide-react";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p data-testid="text-login-error" className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            data-testid="button-dashboard-login"
            className="btn-primary w-full py-3"
          >
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
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/4 transition text-left"
      >
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
        <span className="text-xs text-white/30 flex-shrink-0 ml-4">{formatDate(lead.updatedAt)}</span>
      </button>

      {expanded && msgCount > 0 && (
        <div className="px-5 pb-4 space-y-2 border-t border-white/6 pt-3">
          {(lead.messages as { role: string; content: string }[]).map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#F4A62A]/20 text-[#F4A62A]"
                  : "bg-white/6 text-white/70"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"leads" | "contacts" | "newsletter">("leads");

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
    { key: "leads", label: "Chat Leads", count: capturedLeads.length },
    { key: "contacts", label: "Contact Forms", count: contacts.length },
    { key: "newsletter", label: "Newsletter", count: subscribers.length },
  ] as const;

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "hsl(220 50% 8%)" }}>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white font-heading">Creator Dashboard</h1>
            <p className="text-white/40 text-sm mt-0.5">Elevate360Official · Analytics & Leads</p>
          </div>
          <button
            onClick={onLogout}
            data-testid="button-dashboard-logout"
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Chat Sessions" value={leads.length} icon={MessageSquare} />
          <StatCard label="Leads Captured" value={capturedLeads.length} icon={TrendingUp} color="#22c55e" />
          <StatCard label="Contact Forms" value={contacts.length} icon={Users} color="#a78bfa" />
          <StatCard label="Newsletter" value={subscribers.length} icon={Mail} color="#38bdf8" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/4 rounded-2xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              data-testid={`button-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-[#F4A62A] text-black"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs ${tab === t.key ? "text-black/60" : "text-white/30"}`}>
                ({t.count})
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "leads" && (
          <div className="space-y-3">
            {leads.length === 0 ? (
              <div className="lux-card text-center py-10">
                <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No chat sessions yet</p>
              </div>
            ) : (
              leads.map((lead) => (
                <ChatLeadRow key={lead.id} lead={lead} />
              ))
            )}
          </div>
        )}

        {tab === "contacts" && (
          <div className="space-y-3">
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
