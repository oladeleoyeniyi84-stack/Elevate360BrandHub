import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Testimonial } from "@shared/schema";
import {
  Lock, Users, MessageSquare, Mail, TrendingUp,
  Eye, EyeOff, LogOut, Sparkles, Wand2, Copy, Check,
  Instagram, Newspaper, Twitter, Youtube, Package,
  BookOpen, Music, FileText, AtSign, PenLine, ChevronDown, ChevronUp,
  BarChart3, Reply, Send, CheckCircle2, Inbox,
  Star, Trash2, ToggleLeft, ToggleRight, PlusCircle,
  Database, Edit2, Zap, Calendar, DollarSign, Phone, Trophy, XCircle, AlertCircle, GripVertical,
  Clock, Tag, RefreshCw, ExternalLink, BrainCircuit, AlertTriangle, FileBarChart2, Target,
  Filter, Percent, ArrowDown, TrendingDown, Flame, Banknote, Shield, Activity, ShieldCheck, ShieldAlert,
  ClipboardCheck, Bot, RefreshCcw, BadgeDollarSign, FlaskConical, Cpu, GitMerge, ListTodo, Crown,
} from "lucide-react";
import { AuditTab } from "@/components/AuditTab";
import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";
import { AutomationSummaryCards } from "@/components/dashboard/AutomationSummaryCards";
import { RecoveryQueueTable } from "@/components/dashboard/RecoveryQueueTable";
import { ContentOpportunitiesPanel } from "@/components/dashboard/ContentOpportunitiesPanel";
import { AutonomousAlertsPanel } from "@/components/dashboard/AutonomousAlertsPanel";
import type { SourcePerformanceSnapshot, FunnelLeakReport, OfferPerformanceSnapshot, GrowthExperiment } from "@/types/growth";
import { SourcePerformancePanel } from "@/components/dashboard/SourcePerformancePanel";
import { FunnelLeakPanel } from "@/components/dashboard/FunnelLeakPanel";
import { OfferPerformancePanel } from "@/components/dashboard/OfferPerformancePanel";
import { GrowthExperimentsPanel } from "@/components/dashboard/GrowthExperimentsPanel";
import type { ExecutionPolicy, ExecutionQueueItem, AppliedChange, RollbackEvent } from "@/types/execution";
import { ExecutionPoliciesPanel } from "@/components/dashboard/ExecutionPoliciesPanel";
import { ExecutionQueuePanel } from "@/components/dashboard/ExecutionQueuePanel";
import { AppliedChangesPanel } from "@/components/dashboard/AppliedChangesPanel";
import { RollbackAlertsPanel } from "@/components/dashboard/RollbackAlertsPanel";
import type { FounderOverview, MaturityScores, AiExplanation, SystemHealthSnapshot, QuarterlyStrategyReport, ApprovalRequest as FounderApprovalRequest } from "@/types/founder";
import { FounderCommandPanel } from "@/components/dashboard/FounderCommandPanel";
import { ApprovalsQueuePanel } from "@/components/dashboard/ApprovalsQueuePanel";
import { ExplainabilityPanel } from "@/components/dashboard/ExplainabilityPanel";
import { SystemHealthPanel } from "@/components/dashboard/SystemHealthPanel";
import { MaturityScorePanel } from "@/components/dashboard/MaturityScorePanel";
import type {
  AutomationJob,
  RevenueRecoveryAction,
  RevenueRecoveryStatus,
  ContentOpportunity,
  AutonomousAlert,
  DigestReportLite,
} from "@/types/automation";
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

async function authedJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
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

interface ClickStat {
  product: string;
  label: string;
  count: number;
}

interface PageViewRecord {
  createdAt: string;
}

interface Lead {
  id: number;
  sessionId: string;
  leadName: string | null;
  leadEmail: string | null;
  messages: { role: string; content: string }[];
  createdAt: string;
  updatedAt: string;
  // Phase 33 — Intent Router
  intent: string | null;
  intentConfidence: number | null;
  routeTarget: string | null;
  requiresFollowup: boolean;
  capturedEmail: string | null;
  capturedName: string | null;
  // Phase 34 — Lead Scoring
  leadScore: number | null;
  leadTemperature: "cold" | "warm" | "hot" | "priority";
  scoreReasoning: string | null;
  nextAction: string | null;
  assignedStage: string;
  lastActivityAt: string | null;
  // Phase 38 — Conversation Summaries
  sessionSummary: string | null;
  leadQuality: string | null;
  recommendedFollowup: string | null;
  ctaShown: string | null;
  conversionOutcome: string | null;
  // Phase 40 — CRM Pipeline
  pipelineStage: string | null;
  followupDueDate: string | null;
  wonValue: number | null;
  lostReason: string | null;
  stageHistory: { stage: string; at: string; note?: string }[];
  // Phase 42 — Follow-Up Automation
  lastFollowupSentAt: string | null;
  followupCount: number | null;
  recommendedOffer: string | null;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  repliedAt: string | null;
}

function ContactCard({ contact, onReplied }: { contact: ContactMessage; onReplied: (updated: ContactMessage) => void }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localRepliedAt, setLocalRepliedAt] = useState(contact.repliedAt);

  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/contacts/${contact.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send reply");
      }
      return res.json() as Promise<ContactMessage>;
    },
    onSuccess: (updated) => {
      setLocalRepliedAt(updated.repliedAt);
      setReplyOpen(false);
      setReplyText("");
      onReplied(updated);
    },
  });

  return (
    <div className="lux-card space-y-3" data-testid={`contact-card-${contact.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{contact.name}</p>
          <p className="text-xs text-white/40">{contact.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {localRepliedAt ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3" /> Replied
            </span>
          ) : (
            <button
              data-testid={`button-reply-${contact.id}`}
              onClick={() => setReplyOpen((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#F4A62A]/30 text-[#F4A62A] hover:bg-[#F4A62A]/10 transition"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
          <span className="text-xs text-white/30">{formatDate(contact.createdAt)}</span>
        </div>
      </div>

      <p className="text-sm text-white/60 leading-relaxed border-t border-white/6 pt-2">{contact.message}</p>

      {replyOpen && !localRepliedAt && (
        <div className="border-t border-white/6 pt-3 space-y-2">
          <textarea
            data-testid={`input-reply-${contact.id}`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder={`Write your reply to ${contact.name}…`}
            className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/30">Reply will be sent to {contact.email}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setReplyOpen(false); setReplyText(""); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 transition"
              >
                Cancel
              </button>
              <button
                data-testid={`button-send-reply-${contact.id}`}
                onClick={() => replyMutation.mutate()}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-[#F4A62A] text-black font-semibold hover:bg-[#ffb84d] transition disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {replyMutation.isPending ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </div>
          {replyMutation.isError && (
            <p className="text-red-400 text-xs">{(replyMutation.error as Error)?.message}</p>
          )}
        </div>
      )}
    </div>
  );
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

// ─── Phase 39: Intelligence + Digest Tab ─────────────────────────────────

type IntelligenceData = {
  qualifiedCount: number;
  bookedThisWeek: number;
  wonThisMonth: number;
  overdueFollowups: number;
  topRecommendedOffer: string | null;
  knowledgeBackedChats: number;
  conversionByIntent: Record<string, { total: number; won: number; rate: number }>;
  overdueLeads: { sessionId: string; leadName: string | null; leadEmail: string | null; intent: string | null; followupDueDate: string | null }[];
};

type DigestReport = {
  id: number;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  narrative: string;
  topIntents: { intent: string; count: number }[];
  hotLeadsCount: number;
  qualifiedCount: number;
  bookedCount: number;
  wonValue: number;
  followupsDue: number;
  unansweredHotLeads: number;
  topRecommendedOffer: string | null;
  knowledgeBackedChats: number;
  supportPatterns: string | null;
  contentOpportunities: string | null;
  conversionByIntent: Record<string, number>;
};

function DigestTab() {
  const qc = useQueryClient();
  const [digestHistory, setDigestHistory] = useState(false);

  const intelligenceQ = useQuery<IntelligenceData>({
    queryKey: ["/api/dashboard/intelligence"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/intelligence");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const latestDigestQ = useQuery<DigestReport | null>({
    queryKey: ["/api/digest/latest"],
    queryFn: async () => {
      const res = await fetch("/api/digest/latest");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const allDigestsQ = useQuery<DigestReport[]>({
    queryKey: ["/api/digest/all"],
    queryFn: async () => {
      const res = await fetch("/api/digest/all");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: digestHistory,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/digest/generate", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/digest/latest"] });
      qc.invalidateQueries({ queryKey: ["/api/digest/all"] });
    },
  });

  const founderBriefQ = useQuery<DigestReportLite | null>({
    queryKey: ["founder-brief-latest"],
    queryFn: () => authedJson("/api/digest/founder-brief/latest"),
  });

  const monthlyBriefQ = useQuery<DigestReportLite | null>({
    queryKey: ["monthly-brief-latest"],
    queryFn: () => authedJson("/api/digest/monthly-strategy/latest"),
  });

  const generateFounderBrief = useMutation({
    mutationFn: () => authedJson("/api/digest/founder-brief/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["founder-brief-latest"] }),
  });

  const generateMonthlyBrief = useMutation({
    mutationFn: () => authedJson("/api/digest/monthly-strategy/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monthly-brief-latest"] }),
  });

  const intel = intelligenceQ.data;
  const digest = latestDigestQ.data;

  const intentColors: Record<string, string> = {
    art_commission: "#a78bfa",
    sales_consultation: "#f59e0b",
    sales_service: "#f87171",
    app_interest: "#34d399",
    book_interest: "#60a5fa",
    music_interest: "#c084fc",
    support_request: "#94a3b8",
    general_brand: "#64748b",
  };

  const kpiTiles = [
    { label: "Qualified in Pipeline", value: intel?.qualifiedCount ?? "—", icon: <Target className="w-4 h-4" />, color: "#F4A62A" },
    { label: "Booked This Week", value: intel?.bookedThisWeek ?? "—", icon: <Calendar className="w-4 h-4" />, color: "#22c55e" },
    { label: "Won This Month", value: intel?.wonThisMonth ?? "—", icon: <Trophy className="w-4 h-4" />, color: "#a78bfa" },
    { label: "Overdue Follow-ups", value: intel?.overdueFollowups ?? "—", icon: <AlertTriangle className="w-4 h-4" />, color: intel?.overdueFollowups ? "#f87171" : "#9ca3af" },
    { label: "Knowledge-backed Chats", value: intel?.knowledgeBackedChats ?? "—", icon: <Database className="w-4 h-4" />, color: "#60a5fa" },
    { label: "Top Recommended Offer", value: intel?.topRecommendedOffer ?? "None yet", icon: <Zap className="w-4 h-4" />, color: "#F4A62A", wide: true },
  ];

  return (
    <div className="space-y-8">

      {/* ── Intelligence KPI Tiles ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="w-4 h-4" style={{ color: "#F4A62A" }} />
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Business Intelligence</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {kpiTiles.map((tile) => (
            <div key={tile.label}
              className={`lux-panel p-4 ${tile.wide ? "sm:col-span-3" : ""}`}
              data-testid={`kpi-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-2 mb-2" style={{ color: tile.color }}>
                {tile.icon}
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{tile.label}</span>
              </div>
              <div className="text-2xl font-bold font-heading" style={{ color: tile.color }}>
                {tile.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Overdue Follow-up Alert Panel ── */}
      {intel?.overdueLeads && intel.overdueLeads.length > 0 && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-red-400">{intel.overdueLeads.length} Overdue Follow-up{intel.overdueLeads.length !== 1 ? "s" : ""}</h3>
          </div>
          <div className="space-y-2">
            {intel.overdueLeads.slice(0, 5).map((lead) => (
              <div key={lead.sessionId} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: "rgba(248,113,113,0.06)" }}>
                <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{lead.leadName ?? lead.leadEmail ?? "Anonymous"}</p>
                  {lead.leadEmail && <p className="text-white/40 text-xs truncate">{lead.leadEmail}</p>}
                </div>
                <div className="text-right shrink-0">
                  {lead.intent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${intentColors[lead.intent] ?? "#9ca3af"}20`, color: intentColors[lead.intent] ?? "#9ca3af" }}>
                      {lead.intent.replace(/_/g, " ")}
                    </span>
                  )}
                  {lead.followupDueDate && (
                    <p className="text-red-400 text-[10px] mt-0.5">
                      Due {new Date(lead.followupDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {intel.overdueLeads.length > 5 && (
              <p className="text-white/30 text-xs text-center">+{intel.overdueLeads.length - 5} more overdue — check Pipeline tab</p>
            )}
          </div>
        </div>
      )}

      {/* ── Conversion by Intent ── */}
      {intel?.conversionByIntent && Object.keys(intel.conversionByIntent).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileBarChart2 className="w-4 h-4" style={{ color: "#F4A62A" }} />
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Conversion Rate by Intent</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(intel.conversionByIntent)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([intent, data]) => (
                <div key={intent} className="lux-panel p-3" data-testid={`conversion-row-${intent}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold w-36 truncate" style={{ color: intentColors[intent] ?? "#9ca3af" }}>
                      {intent.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full transition-all" style={{
                        width: `${data.rate}%`,
                        background: intentColors[intent] ?? "#9ca3af",
                      }} />
                    </div>
                    <span className="text-xs text-white/40 w-20 text-right">{data.won}/{data.total} · {data.rate}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Weekly Digest Generator ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "#F4A62A" }} />
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Weekly Intelligence Digest</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="btn-digest-history"
              onClick={() => setDigestHistory((p) => !p)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors">
              {digestHistory ? "Hide History" : "View History"}
            </button>
            <button
              data-testid="btn-generate-digest"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: "rgba(244,166,42,0.15)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.3)" }}>
              {generateMutation.isPending ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Generating…</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" />Generate Digest</>
              )}
            </button>
          </div>
        </div>

        {generateMutation.isError && (
          <div className="mb-4 p-3 rounded-xl text-red-400 text-sm"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
            {(generateMutation.error as Error).message}
          </div>
        )}

        {/* Latest digest */}
        {digest ? (
          <div className="lux-panel p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-white/30 font-mono">
                  Week of {new Date(digest.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–
                  {new Date(digest.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="text-[11px] text-white/20 mt-0.5">
                  Generated {new Date(digest.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
              <div className="flex gap-3 flex-wrap text-xs">
                <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(244,166,42,0.1)", color: "#F4A62A" }}>
                  🔥 {digest.hotLeadsCount} hot leads
                </span>
                {digest.wonValue > 0 && (
                  <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                    💰 ${(digest.wonValue / 100).toFixed(0)} won
                  </span>
                )}
                {digest.followupsDue > 0 && (
                  <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                    ⏰ {digest.followupsDue} overdue
                  </span>
                )}
              </div>
            </div>

            {/* AI Narrative — rendered with markdown-light formatting */}
            <div className="text-white/75 text-sm leading-relaxed whitespace-pre-line border-t border-white/6 pt-4">
              {digest.narrative}
            </div>

            {/* Top intents bar */}
            {digest.topIntents.length > 0 && (
              <div className="border-t border-white/6 pt-4">
                <p className="text-[11px] text-white/30 uppercase tracking-wide mb-2">Top Intents This Week</p>
                <div className="flex flex-wrap gap-2">
                  {digest.topIntents.map((ti) => (
                    <span key={ti.intent} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: `${intentColors[ti.intent] ?? "#9ca3af"}18`, color: intentColors[ti.intent] ?? "#9ca3af" }}>
                      {ti.intent.replace(/_/g, " ")} ×{ti.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {digest.topRecommendedOffer && (
              <div className="flex items-center gap-2 p-3 rounded-xl border-t border-white/6 pt-4">
                <Zap className="w-4 h-4 shrink-0" style={{ color: "#F4A62A" }} />
                <p className="text-sm text-white/60">
                  Top offer to push: <strong className="text-white">{digest.topRecommendedOffer}</strong>
                </p>
              </div>
            )}
          </div>
        ) : latestDigestQ.isLoading ? (
          <div className="lux-panel p-8 text-center text-white/30">Loading…</div>
        ) : (
          <div className="lux-panel p-8 text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto opacity-20" style={{ color: "#F4A62A" }} />
            <p className="text-white/30">No digest generated yet.</p>
            <p className="text-white/20 text-xs">Click "Generate Digest" to get your first AI-powered weekly intelligence report.</p>
          </div>
        )}
      </div>

      {/* ── Digest History ── */}
      {digestHistory && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest">Past Digests</h4>
          {allDigestsQ.isLoading && <p className="text-white/30 text-sm">Loading…</p>}
          {(allDigestsQ.data ?? []).slice(1).map((d) => (
            <div key={d.id} className="lux-panel p-4" data-testid={`digest-history-${d.id}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/30 font-mono">
                  Week of {new Date(d.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <div className="flex gap-2 text-[11px]">
                  <span className="text-white/30">🔥 {d.hotLeadsCount}</span>
                  {d.wonValue > 0 && <span style={{ color: "#22c55e" }}>💰 ${(d.wonValue / 100).toFixed(0)}</span>}
                </div>
              </div>
              <p className="text-white/50 text-xs line-clamp-3">{d.narrative.split("\n")[0]}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Phase 49: Typed Digest Reports ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="lux-card p-5" data-testid="panel-founder-brief">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Founder Weekly Brief</h3>
              <p className="text-sm text-slate-400">Latest executive summary for weekly operations.</p>
            </div>
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
              onClick={() => generateFounderBrief.mutate()}
              disabled={generateFounderBrief.isPending}
              data-testid="button-generate-founder-brief"
            >
              {generateFounderBrief.isPending ? "Generating…" : "Generate Now"}
            </button>
          </div>
          <div className="text-sm text-slate-300 whitespace-pre-wrap" data-testid="text-founder-brief">
            {founderBriefQ.data?.content || "No founder brief generated yet."}
          </div>
        </div>

        <div className="lux-card p-5" data-testid="panel-monthly-brief">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Monthly Strategy Brief</h3>
              <p className="text-sm text-slate-400">Trend and recommendation summary for monthly planning.</p>
            </div>
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
              onClick={() => generateMonthlyBrief.mutate()}
              disabled={generateMonthlyBrief.isPending}
              data-testid="button-generate-monthly-brief"
            >
              {generateMonthlyBrief.isPending ? "Generating…" : "Generate Now"}
            </button>
          </div>
          <div className="text-sm text-slate-300 whitespace-pre-wrap" data-testid="text-monthly-brief">
            {monthlyBriefQ.data?.content || "No monthly strategy brief generated yet."}
          </div>
        </div>
      </div>
    </div>
  );
}

function DigestButton() {
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/digest", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => setSent(true),
  });

  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/8"
      style={{ background: "rgba(244,166,42,0.05)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,166,42,0.12)" }}>
          <Inbox className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Email Digest</p>
          <p className="text-xs text-white/40 mt-0.5">Send a snapshot of all key stats to weareelevate360@gmail.com</p>
        </div>
      </div>
      <button
        data-testid="button-send-digest"
        onClick={() => { setSent(false); mutation.mutate(); }}
        disabled={mutation.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
        style={{ background: sent ? "rgba(34,197,94,0.15)" : "rgba(244,166,42,0.15)", color: sent ? "#22c55e" : "#F4A62A", border: `1px solid ${sent ? "rgba(34,197,94,0.3)" : "rgba(244,166,42,0.3)"}` }}
      >
        {mutation.isPending ? (
          <><Send className="h-4 w-4 animate-pulse" />Sending…</>
        ) : sent ? (
          <><CheckCircle2 className="h-4 w-4" />Sent!</>
        ) : (
          <><Send className="h-4 w-4" />Send Digest</>
        )}
      </button>
    </div>
  );
}

function Analytics({
  leads, contacts, subscribers, clicks, pageViewData,
}: {
  leads: Lead[];
  contacts: ContactMessage[];
  subscribers: NewsletterSubscriber[];
  clicks: ClickStat[];
  pageViewData: PageViewRecord[];
}) {
  const capturedLeads = leads.filter((l) => l.leadEmail);
  const activeLeads = leads.filter((l) => (l.messages as any[]).length > 0);

  const chatByDay = groupByDay(leads.map((l) => l.createdAt));
  const subCumulative = cumulativeByDay(subscribers.map((s) => s.subscribedAt));
  const contactByDay = groupByDay(contacts.map((c) => c.createdAt));
  const pageViewsByDay = groupByDay(pageViewData.map((v) => v.createdAt));

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Page Views", value: pageViewData.length, sub: "all-time visits", color: "#fb923c" },
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

      {/* Page Views Over Time */}
      <div className="lux-card">
        <h3 className="text-sm font-semibold text-white/70 mb-5 flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#fb923c]" />
          Page Views — Last 30 Days
          <span className="ml-auto text-xs font-normal text-white/30">{pageViewData.length} total</span>
        </h3>
        {pageViewData.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No visits recorded yet — tracking starts automatically on each page load.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={pageViewsByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} interval={6} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} itemStyle={{ color: "#fb923c" }} />
              <Area type="monotone" dataKey="count" name="Views" stroke="#fb923c" strokeWidth={2} fill="url(#pvGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
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

      {/* Link Click Leaderboard */}
      <div className="lux-card">
        <h3 className="text-sm font-semibold text-white/70 mb-5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#F4A62A]" />
          Link Clicks — All Time
        </h3>
        {clicks.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No link clicks recorded yet — they appear here as visitors explore your products.</p>
        ) : (
          <div className="space-y-3">
            {clicks.map(({ label, product, count }) => {
              const max = clicks[0]?.count ?? 1;
              const pct = Math.round((count / max) * 100);
              const COLOR_MAP: Record<string, string> = {
                app: "#F4A62A",
                book: "#38bdf8",
                music: "#a78bfa",
                art: "#22c55e",
              };
              const fill = COLOR_MAP[product] ?? "#F4A62A";
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: fill }}
                      />
                      {label}
                    </span>
                    <span className="font-semibold" style={{ color: fill }}>{count} click{count !== 1 ? "s" : ""}</span>
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
            <div className="pt-3 flex flex-wrap gap-3 border-t border-white/8">
              {[
                { key: "app", label: "Apps", color: "#F4A62A" },
                { key: "book", label: "Books", color: "#38bdf8" },
                { key: "music", label: "Music", color: "#a78bfa" },
                { key: "art", label: "Art", color: "#22c55e" },
              ].map(({ key, label, color }) => {
                const total = clicks.filter((c) => c.product === key).reduce((s, c) => s + c.count, 0);
                if (total === 0) return null;
                return (
                  <span key={key} className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: `${color}40`, color }}>
                    {label}: {total}
                  </span>
                );
              })}
            </div>
          </div>
        )}
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

const TEMP_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  priority: { bg: "bg-red-500/15", text: "text-red-400", label: "🔥 Priority" },
  hot: { bg: "bg-orange-500/15", text: "text-orange-400", label: "🌡 Hot" },
  warm: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "☀ Warm" },
  cold: { bg: "bg-blue-500/10", text: "text-blue-400", label: "❄ Cold" },
};

function TemperatureBadge({ temp }: { temp: string }) {
  const s = TEMP_STYLES[temp] ?? TEMP_STYLES.cold;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

const INTENT_COLORS: Record<string, string> = {
  sales_service: "bg-green-500/15 text-green-400",
  sales_consultation: "bg-emerald-500/15 text-emerald-400",
  art_commission: "bg-violet-500/15 text-violet-400",
  app_interest: "bg-blue-500/15 text-blue-400",
  book_interest: "bg-amber-500/15 text-amber-400",
  music_interest: "bg-pink-500/15 text-pink-400",
  media_press: "bg-cyan-500/15 text-cyan-400",
  collaboration: "bg-indigo-500/15 text-indigo-400",
  newsletter: "bg-teal-500/15 text-teal-400",
  support: "bg-orange-500/15 text-orange-400",
  general_brand: "bg-white/10 text-white/60",
  unknown: "bg-white/6 text-white/30",
};

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  converted:        { label: "Converted",      color: "text-green-400" },
  warm_lead:        { label: "Warm Lead",      color: "text-yellow-400" },
  cold_lead:        { label: "Cold Lead",      color: "text-blue-400" },
  support_resolved: { label: "Support ✓",      color: "text-teal-400" },
  no_action:        { label: "No Action",      color: "text-white/30" },
  browsing:         { label: "Browsing",       color: "text-white/40" },
};

function IntentBadge({ intent }: { intent: string }) {
  const cls = INTENT_COLORS[intent] ?? INTENT_COLORS.unknown;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cls}`}>
      {intent.replace(/_/g, " ")}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? "#f87171" : score >= 50 ? "#fb923c" : score >= 25 ? "#facc15" : "#60a5fa";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {score}
    </span>
  );
}

function ChatLeadRow({ lead, onConverted }: { lead: Lead; onConverted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [draftCopied, setDraftCopied] = useState(false);
  const [sentDone, setSentDone] = useState(false);
  const msgCount = lead.messages?.length ?? 0;
  const temp = lead.leadTemperature ?? "cold";
  const score = lead.leadScore ?? 0;
  const isConverted = lead.assignedStage === "converted" || lead.conversionOutcome === "converted";
  const outcome = lead.conversionOutcome ? OUTCOME_LABELS[lead.conversionOutcome] : null;

  const now = new Date();
  const lastActivity = lead.lastActivityAt ?? lead.updatedAt;
  const daysSilent = lastActivity
    ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isSilentHot = (lead.leadScore ?? 0) >= 50 && daysSilent >= 3 && !isConverted;

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/leads/${lead.sessionId}/convert`, { method: "PATCH" });
      if (!res.ok) throw new Error("Convert failed");
      return res.json();
    },
    onSuccess: onConverted,
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/leads/${lead.sessionId}/followup-draft`, { method: "POST" });
      if (!res.ok) throw new Error("Draft failed");
      return res.json() as Promise<{ subject: string; body: string }>;
    },
    onSuccess: (data) => { setDraft(data); setShowDraft(true); setSentDone(false); setDraftCopied(false); },
  });

  const markSentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dashboard/leads/${lead.sessionId}/followup-sent`, { method: "POST" });
      if (!res.ok) throw new Error("Mark sent failed");
      return res.json();
    },
    onSuccess: () => { setSentDone(true); },
  });

  return (
    <div className={`border rounded-2xl overflow-hidden transition ${
      isConverted
        ? "border-green-500/20 bg-green-500/3"
        : isSilentHot
          ? "border-orange-500/30 bg-orange-500/4"
          : "border-white/8"
    }`}
      data-testid={`card-lead-${lead.id}`}>
      <button onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/4 transition text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#F4A62A]/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-[#F4A62A]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white truncate">
                {lead.leadName || lead.capturedName || <span className="text-white/40 font-normal italic">Anonymous</span>}
              </p>
              <TemperatureBadge temp={temp} />
              {lead.intent && <IntentBadge intent={lead.intent} />}
              {lead.requiresFollowup && !isConverted && !isSilentHot && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-500/15 text-purple-400">
                  Follow-up needed
                </span>
              )}
              {isSilentHot && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-500/15 text-orange-400">
                  🔔 Silent {daysSilent}d
                </span>
              )}
              {isConverted && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-500/15 text-green-400">
                  ✓ Converted
                </span>
              )}
            </div>
            {/* Summary preview */}
            {lead.sessionSummary ? (
              <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{lead.sessionSummary}</p>
            ) : (
              <p className="text-xs text-white/30 truncate">
                {lead.leadEmail || lead.capturedEmail || "No email captured"} · {msgCount} messages
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <ScoreBadge score={score} />
            {outcome && <span className={`text-[10px] ${outcome.color}`}>{outcome.label}</span>}
          </div>
          <span className="text-xs text-white/30 hidden sm:block">{formatDate(lead.updatedAt)}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/6 pt-4">
          {/* Summary block */}
          {lead.sessionSummary && (
            <div className="bg-[#F4A62A]/8 border border-[#F4A62A]/15 rounded-xl px-4 py-3">
              <p className="text-[10px] text-[#F4A62A]/60 uppercase tracking-wide mb-1">AI Session Summary</p>
              <p className="text-sm text-white/80 leading-relaxed">{lead.sessionSummary}</p>
            </div>
          )}

          {/* Intelligence grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lead.intent && (
              <div className="bg-white/3 rounded-xl px-3 py-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Detected Intent</p>
                <p className="text-xs text-white/80 font-medium">{lead.intent.replace(/_/g, " ")}</p>
                {lead.routeTarget && <p className="text-[10px] text-white/30 mt-0.5">→ {lead.routeTarget.replace(/_/g, " ")}</p>}
              </div>
            )}
            {lead.leadQuality && (
              <div className="bg-white/3 rounded-xl px-3 py-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Lead Quality</p>
                <p className="text-xs text-white/80 font-medium capitalize">{lead.leadQuality}</p>
                {lead.ctaShown && lead.ctaShown !== "none" && (
                  <p className="text-[10px] text-white/30 mt-0.5">CTA: {lead.ctaShown}</p>
                )}
              </div>
            )}
            {lead.recommendedFollowup && (
              <div className="bg-white/3 rounded-xl px-3 py-2 sm:col-span-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Recommended Follow-up</p>
                <p className="text-xs text-white/80">{lead.recommendedFollowup}</p>
              </div>
            )}
            {lead.nextAction && !lead.recommendedFollowup && (
              <div className="bg-white/3 rounded-xl px-3 py-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Next Action</p>
                <p className="text-xs text-white/80">{lead.nextAction}</p>
              </div>
            )}
            {lead.scoreReasoning && (
              <div className="bg-white/3 rounded-xl px-3 py-2 sm:col-span-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Score Reasoning</p>
                <p className="text-xs text-white/60">{lead.scoreReasoning}</p>
              </div>
            )}
          </div>

          {/* Follow-Up Draft Panel */}
          {!isConverted && (
            <div className="pt-1 space-y-2">
              <div className="flex flex-wrap gap-2 justify-end items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); draftMutation.mutate(); }}
                  disabled={draftMutation.isPending}
                  data-testid={`button-followup-draft-${lead.id}`}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition disabled:opacity-50"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {draftMutation.isPending ? "Generating…" : "AI Follow-Up Draft"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); convertMutation.mutate(); }}
                  disabled={convertMutation.isPending}
                  data-testid={`button-convert-lead-${lead.id}`}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {convertMutation.isPending ? "Marking…" : "Mark as Converted"}
                </button>
              </div>

              {showDraft && draft && (
                <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-orange-400/70 uppercase tracking-wide font-semibold">AI Follow-Up Draft</p>
                    {lead.followupCount != null && lead.followupCount > 0 && (
                      <span className="text-[10px] text-white/40">{lead.followupCount} sent so far</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 mb-0.5">Subject</p>
                    <p className="text-xs font-semibold text-white/90">{draft.subject}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 mb-0.5">Body</p>
                    <p className="text-xs text-white/75 whitespace-pre-wrap leading-relaxed">{draft.body}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
                        setDraftCopied(true);
                        setTimeout(() => setDraftCopied(false), 2000);
                      }}
                      data-testid={`button-copy-draft-${lead.id}`}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/6 text-white/60 hover:bg-white/10 transition border border-white/8"
                    >
                      <Copy className="h-3 w-3" />
                      {draftCopied ? "Copied!" : "Copy"}
                    </button>
                    {sentDone ? (
                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-green-400">
                        <CheckCircle2 className="h-3 w-3" /> Sent logged · due in 5 days
                      </span>
                    ) : (
                      <button
                        onClick={() => markSentMutation.mutate()}
                        disabled={markSentMutation.isPending}
                        data-testid={`button-mark-sent-${lead.id}`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition border border-green-500/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {markSentMutation.isPending ? "Saving…" : "Mark as Sent"}
                      </button>
                    )}
                    <button
                      onClick={() => setShowDraft(false)}
                      className="ml-auto text-xs text-white/30 hover:text-white/60 transition"
                    >Dismiss</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          {msgCount > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
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
      )}
    </div>
  );
}

// Phase 42 — Reminder Queue Panel
function ReminderQueuePanel({ onNavigate }: { onNavigate?: (sessionId: string) => void }) {
  const { data, isLoading, refetch } = useQuery<{
    overdue: Lead[];
    silentHot: Lead[];
  }>({
    queryKey: ["/api/dashboard/reminder-queue"],
    refetchInterval: 60_000,
  });

  const overdue = data?.overdue ?? [];
  const silentHot = data?.silentHot ?? [];
  const total = overdue.length + silentHot.length;

  if (isLoading) return null;
  if (total === 0) return null;

  const renderItem = (lead: Lead, badge: React.ReactNode) => {
    const name = lead.leadName ?? lead.capturedName ?? "Anonymous";
    const email = lead.leadEmail ?? lead.capturedEmail ?? null;
    const lastActivity = lead.lastActivityAt ?? lead.updatedAt;
    const daysSilent = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <div key={lead.sessionId}
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-white truncate">{name}</p>
            {badge}
          </div>
          {email && <p className="text-[10px] text-white/40 truncate">{email}</p>}
          {lead.intent && (
            <p className="text-[10px] text-white/30 capitalize mt-0.5">{lead.intent.replace(/_/g, " ")}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-white/30">{daysSilent}d silent</span>
          <ScoreBadge score={lead.leadScore ?? 0} />
        </div>
      </div>
    );
  };

  return (
    <div className="lux-card border border-orange-500/20 bg-orange-500/4 mb-4" data-testid="panel-reminder-queue">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-orange-400">🔔 Follow-Up Queue</p>
          <p className="text-[10px] text-white/40 mt-0.5">{total} lead{total !== 1 ? "s" : ""} need attention</p>
        </div>
        <button onClick={() => refetch()} className="text-[10px] text-white/30 hover:text-white/60 transition">Refresh</button>
      </div>

      <div className="space-y-2">
        {overdue.map((lead) =>
          renderItem(lead, (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold">
              Overdue
            </span>
          ))
        )}
        {silentHot.map((lead) => {
          const lastActivity = lead.lastActivityAt ?? lead.updatedAt;
          const daysSilent = lastActivity
            ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return renderItem(lead, (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-semibold">
              Hot · {daysSilent}d silent
            </span>
          ));
        })}
      </div>
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

const PRODUCTS = ["Bondedlove", "Healthwisesupport", "Video Crafter", "Amazon KDP", "Etsy", "Music"];

function ReviewsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", handle: "", product: "Bondedlove", rating: 5, body: "" });
  const [showForm, setShowForm] = useState(false);

  const allQuery = useQuery<Testimonial[]>({
    queryKey: ["/api/dashboard/testimonials"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/testimonials");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard/testimonials"] });
      qc.invalidateQueries({ queryKey: ["/api/testimonials"] });
      setForm({ name: "", handle: "", product: "Bondedlove", rating: 5, body: "" });
      setShowForm(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/testimonials/${id}/toggle`, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard/testimonials"] });
      qc.invalidateQueries({ queryKey: ["/api/testimonials"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/testimonials/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard/testimonials"] });
      qc.invalidateQueries({ queryKey: ["/api/testimonials"] });
    },
  });

  const items = allQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{items.length} testimonial{items.length !== 1 ? "s" : ""} · {items.filter(i => i.approved).length} visible on site</p>
        <button
          data-testid="button-add-testimonial"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}
        >
          <PlusCircle className="h-4 w-4" />
          {showForm ? "Cancel" : "Add Review"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="lux-card space-y-4">
          <h3 className="text-sm font-bold text-white">New Testimonial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Name *</label>
              <input
                data-testid="input-testimonial-name"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50"
                placeholder="Reviewer name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Handle / Source</label>
              <input
                data-testid="input-testimonial-handle"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50"
                placeholder="@username or App Store"
                value={form.handle}
                onChange={e => setForm(f => ({ ...f, handle: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Product *</label>
              <select
                data-testid="select-testimonial-product"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={form.product}
                onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
              >
                {PRODUCTS.map(p => <option key={p} value={p} className="bg-[#0d1a2e]">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Rating *</label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: n }))}
                    data-testid={`button-star-${n}`}>
                    <Star className={`h-6 w-6 ${n <= form.rating ? "text-primary fill-primary" : "text-white/20"}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Review Text *</label>
            <textarea
              data-testid="textarea-testimonial-body"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 resize-none"
              rows={3}
              placeholder="What did they say?"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>
          <button
            data-testid="button-submit-testimonial"
            onClick={() => createMutation.mutate()}
            disabled={!form.name || !form.body || createMutation.isPending}
            className="btn-primary text-sm py-2 px-6 disabled:opacity-50"
          >
            {createMutation.isPending ? "Saving…" : "Save Testimonial"}
          </button>
          {createMutation.isError && <p className="text-red-400 text-xs">{String(createMutation.error)}</p>}
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-white/25 text-sm">
          No testimonials yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(t => (
            <div key={t.id} className="lux-card flex items-start gap-4" data-testid={`row-testimonial-${t.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-bold text-white">{t.name}</span>
                  {t.handle && <span className="text-xs text-white/40">{t.handle}</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50">{t.product}</span>
                  <div className="flex gap-0.5">
                    {Array.from({length:5}).map((_,i) => (
                      <Star key={i} className={`h-3 w-3 ${i < t.rating ? "text-primary fill-primary" : "text-white/15"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-white/55 text-sm leading-relaxed line-clamp-2">"{t.body}"</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  data-testid={`button-toggle-testimonial-${t.id}`}
                  onClick={() => toggleMutation.mutate(t.id)}
                  title={t.approved ? "Hide from site" : "Show on site"}
                  className="transition-opacity hover:opacity-80"
                >
                  {t.approved
                    ? <ToggleRight className="h-6 w-6 text-green-400" />
                    : <ToggleLeft className="h-6 w-6 text-white/25" />}
                </button>
                <button
                  data-testid={`button-delete-testimonial-${t.id}`}
                  onClick={() => deleteMutation.mutate(t.id)}
                  className="text-white/25 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type DashBlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type BlogFormState = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
};

function BlogTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<BlogFormState>({
    title: "", slug: "", excerpt: "", body: "", category: "general",
  });
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: posts = [], isLoading } = useQuery<DashBlogPost[]>({
    queryKey: ["/api/dashboard/posts"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/posts");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: BlogFormState) => {
      const url = editing ? `/api/dashboard/posts/${editing}` : "/api/dashboard/posts";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard/posts"] });
      setForm({ title: "", slug: "", excerpt: "", body: "", category: "general" });
      setEditing(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/posts"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/dashboard/posts/${id}/publish`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/posts"] }),
  });

  const contentOppsQ = useQuery<ContentOpportunity[]>({
    queryKey: ["automation-content-opportunities"],
    queryFn: () => authedJson("/api/automation/content-opportunities"),
  });

  const generateContentOps = useMutation({
    mutationFn: () => authedJson("/api/automation/content-opportunities/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-content-opportunities"] }),
  });

  const patchContentOpp = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContentOpportunity["status"] }) =>
      authedJson(`/api/automation/content-opportunities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-content-opportunities"] }),
  });

  const startEdit = (p: DashBlogPost) => {
    setForm({
      title: p.title, slug: p.slug, excerpt: p.excerpt,
      body: p.body, category: p.category,
    });
    setEditing(p.id);
    setShowForm(true);
  };

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Blog Posts</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title: "", slug: "", excerpt: "", body: "", category: "general" }); }}
          data-testid="button-blog-new"
          className="flex items-center gap-2 btn-primary text-sm px-4 py-2"
        >
          <PlusCircle className="h-4 w-4" />
          New Post
        </button>
      </div>

      {showForm && (
        <div className="lux-card space-y-4">
          <h3 className="font-semibold text-white text-sm">{editing ? "Edit Post" : "New Post"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Title</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={form.title}
                data-testid="input-blog-title"
                onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || autoSlug(e.target.value) }))}
                placeholder="Post title..."
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Slug</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={form.slug}
                data-testid="input-blog-slug"
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="post-url-slug"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Excerpt</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={form.excerpt}
                data-testid="input-blog-excerpt"
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                placeholder="Short summary..."
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Category</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={form.category}
                data-testid="input-blog-category"
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="general"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Content (Markdown supported)</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 min-h-[160px] resize-y"
              value={form.body}
              data-testid="input-blog-content"
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Write your post content here..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.title || !form.slug || !form.body || !form.excerpt || saveMutation.isPending}
              data-testid="button-blog-save"
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving…" : editing ? "Update Post" : "Create Draft"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-white/40 text-sm">Loading posts…</p>
      ) : posts.length === 0 ? (
        <div className="lux-card text-center py-10">
          <PenLine className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No blog posts yet. Create your first post!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="flex items-start justify-between gap-4 px-5 py-4 border border-white/8 rounded-2xl" data-testid={`card-blog-${p.id}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.published ? "bg-green-500/15 text-green-400" : "bg-white/8 text-white/30"}`}>
                    {p.published ? "Published" : "Draft"}
                  </span>
                  <span className="text-xs text-white/30">/blog/{p.slug}</span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 truncate">{p.title}</p>
                {p.excerpt && <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{p.excerpt}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate(p.id)}
                  data-testid={`button-blog-toggle-${p.id}`}
                  className="text-white/30 hover:text-primary transition-colors"
                  title={p.published ? "Unpublish" : "Publish"}
                >
                  {p.published ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => startEdit(p)} data-testid={`button-blog-edit-${p.id}`}
                  className="text-white/30 hover:text-primary transition-colors">
                  <PenLine className="h-4 w-4" />
                </button>
                <button onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(p.id); }}
                  data-testid={`button-blog-delete-${p.id}`}
                  className="text-white/30 hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Phase 49: Content Opportunities ── */}
      <div className="mt-6 flex justify-end mb-2">
        <button
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
          onClick={() => generateContentOps.mutate()}
          disabled={generateContentOps.isPending}
          data-testid="button-generate-content-ops-blog"
        >
          {generateContentOps.isPending ? "Generating…" : "Generate Content Opportunities"}
        </button>
      </div>
      <ContentOpportunitiesPanel
        rows={contentOppsQ.data || []}
        onUpdate={(id, status) => patchContentOpp.mutate({ id, status })}
      />
    </div>
  );
}

// ─── Phase 35: Knowledge Base Tab ─────────────────────────────────────────

const KB_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "brand_story", label: "Brand Story" },
  { value: "services", label: "Services" },
  { value: "apps", label: "Apps" },
  { value: "books", label: "Books" },
  { value: "music", label: "Music" },
  { value: "art_studio", label: "Art Studio" },
  { value: "faq", label: "FAQ" },
  { value: "pricing", label: "Pricing" },
  { value: "collaboration", label: "Collaboration" },
  { value: "support", label: "Support" },
];

const CAT_COLORS: Record<string, string> = {
  general: "bg-white/10 text-white/50",
  brand_story: "bg-violet-500/15 text-violet-400",
  services: "bg-green-500/15 text-green-400",
  apps: "bg-blue-500/15 text-blue-400",
  books: "bg-amber-500/15 text-amber-400",
  music: "bg-pink-500/15 text-pink-400",
  art_studio: "bg-purple-500/15 text-purple-400",
  faq: "bg-teal-500/15 text-teal-400",
  pricing: "bg-orange-500/15 text-orange-400",
  collaboration: "bg-indigo-500/15 text-indigo-400",
  support: "bg-red-500/15 text-red-400",
};

interface KBDoc {
  id: number;
  title: string;
  category: string;
  content: string;
  isPublished: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface KBForm {
  title: string;
  category: string;
  content: string;
  priority: number;
  isPublished: boolean;
}

const EMPTY_KB_FORM: KBForm = { title: "", category: "general", content: "", priority: 0, isPublished: true };

function KnowledgeTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<KBForm>(EMPTY_KB_FORM);
  const [preview, setPreview] = useState<{ prompt: string; docCount: number; docs: { id: number; title: string; category: string }[] } | null>(null);
  const [previewIntent, setPreviewIntent] = useState("general_brand");
  const [showPreview, setShowPreview] = useState(false);

  const { data: docs = [], isLoading } = useQuery<KBDoc[]>({
    queryKey: ["/api/dashboard/knowledge"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/knowledge");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: KBForm) => {
      const url = editing ? `/api/dashboard/knowledge/${editing}` : "/api/dashboard/knowledge";
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Save failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard/knowledge"] });
      setForm(EMPTY_KB_FORM);
      setEditing(null);
      setShowForm(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/dashboard/knowledge/${id}/publish`, { method: "PATCH" });
      if (!r.ok) throw new Error("Toggle failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/knowledge"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/dashboard/knowledge/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/knowledge"] }),
  });

  const kbContentOppsQ = useQuery<ContentOpportunity[]>({
    queryKey: ["automation-content-opportunities"],
    queryFn: () => authedJson("/api/automation/content-opportunities"),
  });

  const kbGenerateContentOps = useMutation({
    mutationFn: () => authedJson("/api/automation/content-opportunities/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-content-opportunities"] }),
  });

  const kbPatchContentOpp = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContentOpportunity["status"] }) =>
      authedJson(`/api/automation/content-opportunities/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-content-opportunities"] }),
  });

  const loadPreview = async () => {
    const r = await fetch(`/api/knowledge/preview?intent=${previewIntent}`);
    const data = await r.json();
    setPreview(data);
    setShowPreview(true);
  };

  const startEdit = (doc: KBDoc) => {
    setForm({ title: doc.title, category: doc.category, content: doc.content, priority: doc.priority, isPublished: doc.isPublished });
    setEditing(doc.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-[#F4A62A]" />
            Knowledge Base
          </h2>
          <p className="text-xs text-white/40 mt-0.5">{docs.filter((d) => d.isPublished).length} published · injected into AI Concierge</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview((v) => !v)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Preview AI
          </button>
          <button onClick={() => { setForm(EMPTY_KB_FORM); setEditing(null); setShowForm((v) => !v); }}
            data-testid="button-knowledge-new"
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" /> New Document
          </button>
        </div>
      </div>

      {/* Preview what AI sees */}
      {showPreview && (
        <div className="lux-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white flex items-center gap-2"><Eye className="h-4 w-4 text-[#F4A62A]" /> Preview What AI Sees</p>
            <button onClick={() => setShowPreview(false)} className="text-white/30 hover:text-white/70"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={previewIntent} onChange={(e) => setPreviewIntent(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white">
              {["general_brand","app_interest","book_interest","music_interest","art_commission","sales_service","sales_consultation","support","collaboration","media_press","newsletter"].map(i => (
                <option key={i} value={i}>{i.replace(/_/g, " ")}</option>
              ))}
            </select>
            <button onClick={loadPreview} className="btn-primary text-xs px-3 py-1.5">Reload Preview</button>
            {preview && <span className="text-xs text-white/40">{preview.docCount} docs injected</span>}
          </div>
          {preview && (
            <div className="bg-black/20 rounded-xl p-3 max-h-80 overflow-y-auto">
              <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Docs included in this intent context:</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {preview.docs.map((d) => (
                  <span key={d.id} className={`text-[10px] px-2 py-0.5 rounded-full ${CAT_COLORS[d.category] ?? CAT_COLORS.general}`}>
                    {d.title}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Full system prompt preview:</p>
              <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-mono leading-relaxed">{preview.prompt}</pre>
            </div>
          )}
          {!preview && <p className="text-xs text-white/30">Click "Reload Preview" to see the injected AI context</p>}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="lux-card space-y-4">
          <p className="text-sm font-semibold text-white">{editing ? "Edit Document" : "New Knowledge Document"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/40 mb-1">Title *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={form.title} data-testid="input-kb-title"
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Bondedlove App Overview" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Category *</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                value={form.category} data-testid="select-kb-category"
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {KB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Priority (0–100, higher = first injected)</label>
              <input type="number" min={0} max={100}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                value={form.priority} data-testid="input-kb-priority"
                onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/40 mb-1">Content *</label>
              <textarea rows={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 resize-y"
                value={form.content} data-testid="textarea-kb-content"
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write the authoritative information the AI concierge should know about this topic..." />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublished}
                  onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                  className="accent-primary" data-testid="checkbox-kb-published" />
                <span className="text-sm text-white/60">Active (inject into AI)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveMutation.mutate(form)}
              disabled={!form.title || !form.content || saveMutation.isPending}
              data-testid="button-kb-save"
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50">
              {saveMutation.isPending ? "Saving…" : editing ? "Update" : "Save Document"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="text-white/30 text-sm text-center py-6">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="lux-card text-center py-10">
          <Database className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-1">No knowledge documents yet</p>
          <p className="text-white/25 text-xs">Add documents to ground the AI Concierge in authoritative brand information</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className={`flex items-start gap-3 px-4 py-3 rounded-2xl border transition ${doc.isPublished ? "border-white/8 bg-white/2" : "border-white/4 bg-white/1 opacity-60"}`}
              data-testid={`card-kb-${doc.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CAT_COLORS[doc.category] ?? CAT_COLORS.general}`}>
                    {doc.category.replace(/_/g, " ")}
                  </span>
                  {doc.priority > 0 && (
                    <span className="text-[10px] text-[#F4A62A]/60">P{doc.priority}</span>
                  )}
                  {!doc.isPublished && (
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">Draft</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white mt-1 truncate">{doc.title}</p>
                <p className="text-xs text-white/30 mt-0.5 line-clamp-2">{doc.content}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 mt-1">
                <button onClick={() => startEdit(doc)} title="Edit" data-testid={`button-kb-edit-${doc.id}`}
                  className="text-white/30 hover:text-white/70 transition"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => toggleMutation.mutate(doc.id)} title={doc.isPublished ? "Deactivate" : "Activate"}
                  data-testid={`button-kb-toggle-${doc.id}`}
                  className="text-white/30 hover:text-primary transition">
                  {doc.isPublished ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => deleteMutation.mutate(doc.id)} title="Delete" data-testid={`button-kb-delete-${doc.id}`}
                  className="text-white/30 hover:text-red-400 transition"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Phase 49: Content Opportunities ── */}
      <div className="mt-6 flex justify-end mb-2">
        <button
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
          onClick={() => kbGenerateContentOps.mutate()}
          disabled={kbGenerateContentOps.isPending}
          data-testid="button-generate-content-ops-kb"
        >
          {kbGenerateContentOps.isPending ? "Generating…" : "Generate Content Opportunities"}
        </button>
      </div>
      <ContentOpportunitiesPanel
        rows={kbContentOppsQ.data || []}
        onUpdate={(id, status) => kbPatchContentOpp.mutate({ id, status })}
      />
    </div>
  );
}

// ─── Phase 40: CRM Pipeline Tab ────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "new",        label: "New",       color: "border-blue-500/30 bg-blue-500/5",   badge: "bg-blue-500/20 text-blue-300",     icon: Inbox },
  { key: "contacted",  label: "Contacted", color: "border-purple-500/30 bg-purple-500/5", badge: "bg-purple-500/20 text-purple-300",icon: Phone },
  { key: "qualified",  label: "Qualified", color: "border-cyan-500/30 bg-cyan-500/5",   badge: "bg-cyan-500/20 text-cyan-300",     icon: CheckCircle2 },
  { key: "booked",     label: "Booked",    color: "border-amber-500/30 bg-amber-500/5", badge: "bg-amber-500/20 text-amber-300",   icon: Calendar },
  { key: "won",        label: "Won",       color: "border-green-500/30 bg-green-500/5", badge: "bg-green-500/20 text-green-300",   icon: Trophy },
  { key: "nurture",    label: "Nurture",   color: "border-orange-500/30 bg-orange-500/5", badge: "bg-orange-500/20 text-orange-300",icon: AlertCircle },
  { key: "closed",     label: "Closed",    color: "border-red-500/30 bg-red-500/5",     badge: "bg-red-500/20 text-red-300",       icon: XCircle },
] as const;

type PipelineStageKey = (typeof PIPELINE_STAGES)[number]["key"];

function PipelineLeadCard({ lead, onStageChange }: { lead: Lead; onStageChange: () => void }) {
  const [changingStage, setChangingStage] = useState(false);
  const [wonValue, setWonValue] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [note, setNote] = useState("");

  const stageMutation = useMutation({
    mutationFn: async (stage: string) => {
      const r = await fetch(`/api/dashboard/leads/${lead.sessionId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          note: note || undefined,
          wonValue: wonValue ? Number(wonValue) : undefined,
          lostReason: lostReason || undefined,
          followupDueDate: followupDate || undefined,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      setChangingStage(false);
      onStageChange();
    },
  });

  const currentStage = PIPELINE_STAGES.find((s) => s.key === lead.pipelineStage) ?? PIPELINE_STAGES[0];
  const score = lead.leadScore ?? 0;
  const scoreColor = score >= 75 ? "#f87171" : score >= 50 ? "#fb923c" : score >= 25 ? "#facc15" : "#60a5fa";
  const isOverdue = lead.followupDueDate && new Date(lead.followupDueDate) < new Date();
  const lastActivity = lead.lastActivityAt ?? lead.updatedAt;
  const pipelineDaysSilent = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isRedAlert = pipelineDaysSilent >= 7 && !["won", "lost", "closed"].includes(lead.pipelineStage ?? "");
  const isAmberAlert = !isRedAlert && pipelineDaysSilent >= 3 && !["won", "lost", "closed"].includes(lead.pipelineStage ?? "");

  return (
    <div className={`rounded-xl p-3 space-y-2 border ${
      isRedAlert ? "bg-red-500/6 border-red-500/25" : isAmberAlert ? "bg-amber-500/6 border-amber-500/25" : "bg-white/4 border-white/8"
    }`} data-testid={`pipeline-card-${lead.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {lead.leadName || lead.capturedName || <span className="text-white/30 italic">Anonymous</span>}
          </p>
          <p className="text-[10px] text-white/30 truncate">{lead.leadEmail || lead.capturedEmail || "No email"}</p>
        </div>
        <span className="text-xs font-bold shrink-0" style={{ color: scoreColor }}>{score}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {lead.intent && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${INTENT_COLORS[lead.intent] ?? "bg-white/10 text-white/50"}`}>
            {lead.intent.replace(/_/g, " ")}
          </span>
        )}
        <TemperatureBadge temp={lead.leadTemperature ?? "cold"} />
        {isRedAlert && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-red-500/15 text-red-400">
            🔴 {pipelineDaysSilent}d silent
          </span>
        )}
        {isAmberAlert && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400">
            🟡 {pipelineDaysSilent}d silent
          </span>
        )}
      </div>

      {lead.sessionSummary && (
        <p className="text-[10px] text-white/40 line-clamp-2">{lead.sessionSummary}</p>
      )}

      {lead.followupDueDate && (
        <div className={`flex items-center gap-1 text-[10px] ${isOverdue ? "text-red-400" : "text-white/40"}`}>
          <Calendar className="h-3 w-3" />
          {new Date(lead.followupDueDate).toLocaleDateString()}
          {isOverdue && " — OVERDUE"}
        </div>
      )}

      {lead.wonValue && (
        <div className="flex items-center gap-1 text-[10px] text-green-400">
          <DollarSign className="h-3 w-3" />
          ${lead.wonValue.toLocaleString()} won
        </div>
      )}

      {!changingStage ? (
        <button onClick={() => setChangingStage(true)}
          className="w-full text-[10px] py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition flex items-center justify-center gap-1">
          <GripVertical className="h-3 w-3" /> Move Stage
        </button>
      ) : (
        <div className="space-y-2 pt-1 border-t border-white/8">
          <select onChange={(e) => {
            if (e.target.value === lead.pipelineStage) { setChangingStage(false); return; }
            stageMutation.mutate(e.target.value);
          }} defaultValue={lead.pipelineStage ?? "new"}
            className="w-full bg-white/8 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white">
            {PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <input className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder-white/20 focus:outline-none"
            placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <div className="grid grid-cols-2 gap-1">
            <input type="number" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder-white/20 focus:outline-none"
              placeholder="$ Won value" value={wonValue} onChange={e => setWonValue(e.target.value)} />
            <input type="date" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
              value={followupDate} onChange={e => setFollowupDate(e.target.value)} />
          </div>
          <button onClick={() => setChangingStage(false)} className="text-[10px] text-white/30 hover:text-white/60">Cancel</button>
        </div>
      )}
    </div>
  );
}

function PipelineTab({ leads, onStageChange }: { leads: Lead[]; onStageChange: () => void }) {
  const leadsByStage = (stage: string) => leads.filter((l) => (l.pipelineStage ?? "new") === stage);

  const totalWon = leads
    .filter((l) => l.pipelineStage === "won" && l.wonValue)
    .reduce((sum, l) => sum + (l.wonValue ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#F4A62A]" /> CRM Pipeline
          </h2>
          <p className="text-xs text-white/40 mt-0.5">{leads.length} total leads across {PIPELINE_STAGES.length} stages</p>
        </div>
        {totalWon > 0 && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
            <Trophy className="h-4 w-4 text-green-400" />
            <span className="text-sm font-bold text-green-400">${totalWon.toLocaleString()} Won</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
        {PIPELINE_STAGES.map((stage) => {
          const count = leadsByStage(stage.key).length;
          const StageIcon = stage.icon;
          return (
            <div key={stage.key} className={`rounded-xl border px-3 py-2 flex items-center justify-between ${stage.color}`}>
              <div className="flex items-center gap-1.5">
                <StageIcon className="h-3.5 w-3.5 opacity-70" />
                <span className="text-white/70 font-medium">{stage.label}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>{count}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = leadsByStage(stage.key);
          const StageIcon = stage.icon;
          return (
            <div key={stage.key} className={`flex-shrink-0 w-64 rounded-2xl border p-3 space-y-2 ${stage.color}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <StageIcon className="h-4 w-4 opacity-70" />
                  <span className="text-sm font-semibold text-white/80">{stage.label}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>{stageLeads.length}</span>
              </div>
              {stageLeads.length === 0 ? (
                <p className="text-[10px] text-white/20 text-center py-4">Empty</p>
              ) : (
                stageLeads.map((lead) => (
                  <PipelineLeadCard key={lead.id} lead={lead} onStageChange={onStageChange} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phase 37: Orders Tab ──────────────────────────────────────────────────

type StripeOffer = {
  id: string; name: string; description: string | null; active: boolean;
  metadata: Record<string, string>;
  prices: { id: string; unit_amount: number; currency: string; active: boolean }[];
};

type OrderRow = {
  id: number;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  productName: string | null;
  customerEmail: string;
  customerName: string | null;
  amountPaid: number | null;
  currency: string | null;
  status: string;
  sessionId: string | null;
  createdAt: string;
};

type OrderStats = { total: number; paid: number; revenue: number; abandoned: number };

function OrdersTab() {
  const [ordersPanel, setOrdersPanel] = useState<"orders" | "offers">("orders");

  const ordersQ = useQuery<{ orders: OrderRow[]; stats: OrderStats }>({
    queryKey: ["/api/dashboard/orders"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/orders");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const offersQ = useQuery<StripeOffer[]>({
    queryKey: ["/api/dashboard/offers"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/offers");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const orders = ordersQ.data?.orders ?? [];
  const stats = ordersQ.data?.stats ?? { total: 0, paid: 0, revenue: 0, abandoned: 0 };
  const offers = offersQ.data ?? [];

  const statusColor: Record<string, string> = {
    initiated: "#F4A62A",
    paid: "#22c55e",
    refunded: "#f87171",
    failed: "#f87171",
  };

  return (
    <div className="space-y-6">
      {/* Revenue summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: stats.total, color: "#F4A62A" },
          { label: "Paid", value: stats.paid, color: "#22c55e" },
          { label: "Abandoned", value: stats.abandoned, color: "#9ca3af" },
          { label: "Revenue", value: `$${(stats.revenue / 100).toFixed(2)}`, color: "#F4A62A" },
        ].map((s) => (
          <div key={s.label} className="lux-panel p-4 text-center">
            <div className="text-2xl font-bold font-heading" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-3 items-center">
        {(["orders", "offers"] as const).map((p) => (
          <button key={p}
            data-testid={`btn-orders-panel-${p}`}
            onClick={() => setOrdersPanel(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${ordersPanel === p ? "text-black" : "text-white/40 hover:text-white/70"}`}
            style={ordersPanel === p ? { background: "#F4A62A" } : { background: "rgba(255,255,255,0.05)" }}>
            {p === "orders" ? "Order History" : "Stripe Products"}
          </button>
        ))}
        <a href="/#offers" target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-xs text-white/30 hover:text-[#F4A62A] transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> View on Site
        </a>
      </div>

      {/* Order History */}
      {ordersPanel === "orders" && (
        <div className="space-y-3">
          {ordersQ.isLoading && <p className="text-white/40 text-sm">Loading…</p>}
          {!ordersQ.isLoading && orders.length === 0 && (
            <div className="lux-panel p-8 text-center text-white/30">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No orders yet. Share your <a href="/#offers" className="text-[#F4A62A] hover:underline">offers page</a> to start earning.</p>
            </div>
          )}
          {orders.map((o) => (
            <div key={o.id} className="lux-panel p-4" data-testid={`order-row-${o.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{o.productName ?? "Unknown Offer"}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${statusColor[o.status] ?? "#9ca3af"}20`, color: statusColor[o.status] ?? "#9ca3af" }}>
                      {o.status}
                    </span>
                    {o.amountPaid != null && (
                      <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>
                        ${(o.amountPaid / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">{o.customerEmail}{o.customerName ? ` · ${o.customerName}` : ""}</p>
                  {o.stripeSessionId && (
                    <p className="text-white/20 text-[11px] mt-0.5 font-mono truncate">{o.stripeSessionId}</p>
                  )}
                </div>
                <span className="text-white/25 text-xs shrink-0">
                  {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stripe Products */}
      {ordersPanel === "offers" && (
        <div className="space-y-3">
          {offersQ.isLoading && <p className="text-white/40 text-sm">Loading from Stripe…</p>}
          {offers.length === 0 && !offersQ.isLoading && (
            <div className="lux-panel p-6 text-center text-white/30">
              Run the seed script to create products: <code className="text-[#F4A62A] text-xs">npx tsx scripts/seed-stripe-products.ts</code>
            </div>
          )}
          {offers.map((prod) => (
            <div key={prod.id} className="lux-panel p-4" data-testid={`offer-row-${prod.id}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{prod.metadata?.icon ?? "📦"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${prod.active ? "text-white" : "text-white/30 line-through"}`}>{prod.name}</span>
                    {!prod.active && <span className="text-[11px] text-white/30">Inactive</span>}
                    {prod.metadata?.highlight === "true" && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(244,166,42,0.15)", color: "#F4A62A" }}>Popular</span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{prod.description}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    {prod.prices.map((pr) => (
                      <span key={pr.id} className="text-xs font-bold" style={{ color: "#22c55e" }}>
                        ${(pr.unit_amount / 100).toFixed(0)} {pr.currency.toUpperCase()}
                      </span>
                    ))}
                    <span className="text-white/20 text-[11px] font-mono">{prod.id}</span>
                  </div>
                </div>
                <a href={`https://dashboard.stripe.com/products/${prod.id}`}
                  target="_blank" rel="noopener noreferrer"
                  data-testid={`btn-stripe-product-${prod.id}`}
                  className="text-white/30 hover:text-[#F4A62A] transition-colors p-1 shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
          <p className="text-white/25 text-xs text-center pt-2">
            Manage products in <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-[#F4A62A] hover:underline">Stripe Dashboard</a>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Phase 36: Bookings Tab ────────────────────────────────────────────────

type BookingRow = {
  id: number;
  clientName: string;
  clientEmail: string;
  consultationId: number | null;
  preferredDate: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type ConsultRow = {
  id: number;
  title: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
  tag: string | null;
  isActive: boolean;
  displayOrder: number;
};

function BookingsTab() {
  const qc = useQueryClient();
  const [activePanel, setActivePanel] = useState<"bookings" | "offerings">("bookings");
  const [editConsult, setEditConsult] = useState<Partial<ConsultRow> | null>(null);
  const [consultError, setConsultError] = useState("");

  const bookingsQ = useQuery<BookingRow[]>({
    queryKey: ["/api/dashboard/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/bookings");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const consultationsQ = useQuery<ConsultRow[]>({
    queryKey: ["/api/dashboard/consultations"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/consultations");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/dashboard/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/bookings"] }),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/dashboard/bookings/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/bookings"] }),
  });

  const toggleConsult = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/dashboard/consultations/${id}/toggle`, { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/consultations"] }),
  });

  const deleteConsult = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/dashboard/consultations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/consultations"] }),
  });

  const saveConsult = useMutation({
    mutationFn: async (data: Partial<ConsultRow>) => {
      const isNew = !data.id;
      const url = isNew ? "/api/dashboard/consultations" : `/api/dashboard/consultations/${data.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message ?? "Save failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard/consultations"] });
      setEditConsult(null);
      setConsultError("");
    },
    onError: (e: Error) => setConsultError(e.message),
  });

  const statusColor: Record<string, string> = {
    pending: "#F4A62A",
    confirmed: "#22c55e",
    completed: "#38bdf8",
    cancelled: "#f87171",
  };

  const bookings = bookingsQ.data ?? [];
  const consultations = consultationsQ.data ?? [];

  const summary = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: summary.total, color: "#F4A62A" },
          { label: "Pending", value: summary.pending, color: "#F4A62A" },
          { label: "Confirmed", value: summary.confirmed, color: "#22c55e" },
          { label: "Completed", value: summary.completed, color: "#38bdf8" },
        ].map((s) => (
          <div key={s.label} className="lux-panel p-4 text-center">
            <div className="text-2xl font-bold font-heading" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-3">
        {(["bookings", "offerings"] as const).map((p) => (
          <button key={p}
            data-testid={`btn-bookings-panel-${p}`}
            onClick={() => setActivePanel(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activePanel === p ? "text-black" : "text-white/40 hover:text-white/70"}`}
            style={activePanel === p ? { background: "#F4A62A" } : { background: "rgba(255,255,255,0.05)" }}>
            {p === "bookings" ? "Booking Requests" : "Session Offerings"}
          </button>
        ))}
        <a href="/#book-session" target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-xs text-white/30 hover:text-[#F4A62A] transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> View on Site
        </a>
      </div>

      {/* Bookings Panel */}
      {activePanel === "bookings" && (
        <div className="space-y-3">
          {bookingsQ.isLoading && <p className="text-white/40 text-sm">Loading…</p>}
          {!bookingsQ.isLoading && bookings.length === 0 && (
            <div className="lux-panel p-8 text-center text-white/30">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No bookings yet. Share your <a href="/#book-session" className="text-[#F4A62A] hover:underline">booking page</a> to get started.</p>
            </div>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="lux-panel p-4 space-y-3" data-testid={`booking-row-${b.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{b.clientName}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${statusColor[b.status] ?? "#9ca3af"}20`, color: statusColor[b.status] ?? "#9ca3af" }}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">{b.clientEmail}</p>
                  {b.preferredDate && (
                    <p className="text-white/50 text-xs mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{b.preferredDate}</p>
                  )}
                  {b.message && <p className="text-white/50 text-xs mt-1 italic">"{b.message}"</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select data-testid={`select-booking-status-${b.id}`}
                    value={b.status}
                    onChange={(e) => updateStatus.mutate({ id: b.id, status: e.target.value })}
                    className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-[#F4A62A]/50">
                    {["pending","confirmed","completed","cancelled"].map((s) => (
                      <option key={s} value={s} style={{ background: "#0d1a2e" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <button data-testid={`btn-delete-booking-${b.id}`}
                    onClick={() => deleteBooking.mutate(b.id)}
                    className="text-white/20 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Offerings Panel */}
      {activePanel === "offerings" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-white/40 text-sm">{consultations.length} session type{consultations.length !== 1 ? "s" : ""}</p>
            <button data-testid="btn-add-consultation"
              onClick={() => setEditConsult({ title: "", description: "", duration: 60, price: 0, currency: "USD", isActive: true, displayOrder: 0 })}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: "rgba(244,166,42,0.12)", color: "#F4A62A", border: "1px solid rgba(244,166,42,0.25)" }}>
              <PlusCircle className="w-4 h-4" /> Add Session Type
            </button>
          </div>

          {consultationsQ.isLoading && <p className="text-white/40 text-sm">Loading…</p>}

          {consultations.map((c) => (
            <div key={c.id} className="lux-panel p-4 flex items-start gap-3" data-testid={`consult-row-${c.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-sm ${c.isActive ? "text-white" : "text-white/30 line-through"}`}>{c.title}</span>
                  {c.tag && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(244,166,42,0.15)", color: "#F4A62A" }}>{c.tag}</span>}
                  {!c.isActive && <span className="text-[11px] text-white/30">Inactive</span>}
                </div>
                <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/30">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.duration} min</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{c.price === 0 ? "Free" : `$${(c.price / 100).toFixed(0)}`}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button data-testid={`btn-toggle-consult-${c.id}`}
                  onClick={() => toggleConsult.mutate(c.id)}
                  title={c.isActive ? "Deactivate" : "Activate"}
                  className="text-white/30 hover:text-[#F4A62A] transition-colors">
                  {c.isActive ? <ToggleRight className="w-5 h-5 text-[#22c55e]" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button data-testid={`btn-edit-consult-${c.id}`}
                  onClick={() => setEditConsult(c)}
                  className="text-white/30 hover:text-[#F4A62A] transition-colors p-1">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button data-testid={`btn-delete-consult-${c.id}`}
                  onClick={() => deleteConsult.mutate(c.id)}
                  className="text-white/20 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Edit/Add form */}
          {editConsult && (
            <div className="lux-panel p-5 space-y-4 border border-[#F4A62A]/20">
              <h4 className="text-white font-heading font-semibold">{editConsult.id ? "Edit Session Type" : "Add Session Type"}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-white/50 text-xs uppercase tracking-wide mb-1">Title *</label>
                  <input data-testid="input-consult-title"
                    value={editConsult.title ?? ""} onChange={(e) => setEditConsult(ec => ({ ...ec, title: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-white/50 text-xs uppercase tracking-wide mb-1">Description</label>
                  <textarea data-testid="input-consult-desc"
                    rows={2} value={editConsult.description ?? ""} onChange={(e) => setEditConsult(ec => ({ ...ec, description: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50 resize-none" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wide mb-1">Duration (min)</label>
                  <input data-testid="input-consult-duration" type="number" min={15} step={15}
                    value={editConsult.duration ?? 60} onChange={(e) => setEditConsult(ec => ({ ...ec, duration: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wide mb-1">Price (USD, 0 = Free)</label>
                  <input data-testid="input-consult-price" type="number" min={0} step={1}
                    value={editConsult.price != null ? editConsult.price / 100 : 0}
                    onChange={(e) => setEditConsult(ec => ({ ...ec, price: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wide mb-1">Tag (optional)</label>
                  <input data-testid="input-consult-tag"
                    value={editConsult.tag ?? ""} onChange={(e) => setEditConsult(ec => ({ ...ec, tag: e.target.value || null }))}
                    placeholder="e.g. Most Popular"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wide mb-1">Display Order</label>
                  <input data-testid="input-consult-order" type="number" min={0}
                    value={editConsult.displayOrder ?? 0} onChange={(e) => setEditConsult(ec => ({ ...ec, displayOrder: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F4A62A]/50" />
                </div>
              </div>
              {consultError && <p className="text-red-400 text-sm">{consultError}</p>}
              <div className="flex gap-3">
                <button data-testid="btn-save-consult"
                  onClick={() => saveConsult.mutate(editConsult)}
                  disabled={saveConsult.isPending}
                  className="btn-primary px-6 text-sm">
                  {saveConsult.isPending ? "Saving…" : "Save Session"}
                </button>
                <button data-testid="btn-cancel-consult"
                  onClick={() => { setEditConsult(null); setConsultError(""); }}
                  className="btn-secondary px-6 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 41 — Conversion Analytics (Funnel Tab)
// ──────────────────────────────────────────────────────────────────────────────

interface FunnelStage { name: string; count: number; rate: number; }
interface FunnelData {
  totalSessions: number; withIntent: number; emailCaptured: number;
  qualified: number; booked: number; paidOrders: number;
  stages: FunnelStage[];
}
interface IntentRow {
  total: number; qualified: number; qualifiedRate: number;
  booked: number; bookedRate: number; won: number; wonRate: number;
  offered: number; accepted: number; offerAcceptanceRate: number;
}
interface OfferRow {
  timesRecommended: number; timesAccepted: number; acceptanceRate: number;
  bySource: Record<string, number>;
}
interface ConversionData {
  byIntent: Record<string, IntentRow>;
  offerAcceptance: Record<string, OfferRow>;
  byConsultation: Record<string, { title: string; total: number; confirmed: number; confirmRate: number }>;
}

const STAGE_COLORS: Record<string, string> = {
  "Chat Sessions": "#F4A62A",
  "Intent Classified": "#a78bfa",
  "Email Captured": "#38bdf8",
  "Qualified": "#22c55e",
  "Booked": "#fb923c",
  "Won / Paid": "#f43f5e",
};
const INTENT_HEX: Record<string, string> = {
  art_commission: "#f43f5e", sales_consultation: "#F4A62A", sales_service: "#fb923c",
  app_interest: "#a78bfa", book_interest: "#38bdf8", music_interest: "#22c55e",
  support_request: "#94a3b8", general_brand: "#64748b", unclassified: "#374151",
};

// Phase 43 — Offer Recommendation Optimizer Tab
const ALL_INTENTS = [
  "art_commission", "sales_consultation", "sales_service", "app_interest",
  "book_interest", "music_interest", "support_request", "general_brand",
];
const ALL_OFFERS = [
  "Art Commission Deposit", "1:1 Creator Session", "AI Brand Audit",
  "Premium Content Strategy", "Creative Review",
];

type OptimizerData = {
  perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }>;
  perIntent: Record<string, { recommended: number; accepted: number; acceptanceRate: number; topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null }>;
  overrides: { id: number; intent: string; overrideOffer: string; isActive: boolean; updatedAt: string }[];
};

function OfferOptimizerTab() {
  const qc = useQueryClient();
  const [editingIntent, setEditingIntent] = useState<string | null>(null);
  const [editOffer, setEditOffer] = useState("");

  const { data, isLoading } = useQuery<OptimizerData>({
    queryKey: ["/api/dashboard/offer-optimizer"],
    refetchOnWindowFocus: true,
  });

  const setOverrideMutation = useMutation({
    mutationFn: async ({ intent, offer }: { intent: string; offer: string }) => {
      const res = await fetch("/api/dashboard/offer-optimizer/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, offer }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dashboard/offer-optimizer"] });
      setEditingIntent(null);
    },
  });

  const removeOverrideMutation = useMutation({
    mutationFn: async (intent: string) => {
      const res = await fetch(`/api/dashboard/offer-optimizer/override/${intent}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/offer-optimizer"] }),
  });

  const toggleOverrideMutation = useMutation({
    mutationFn: async ({ intent, isActive }: { intent: string; isActive: boolean }) => {
      const res = await fetch(`/api/dashboard/offer-optimizer/override/${intent}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dashboard/offer-optimizer"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 text-[#F4A62A] animate-spin mr-2" />
        <span className="text-white/40 text-sm">Loading offer data…</span>
      </div>
    );
  }

  const perOffer = data?.perOffer ?? {};
  const perIntent = data?.perIntent ?? {};
  const overrides = data?.overrides ?? [];

  const overrideMap: Record<string, { overrideOffer: string; isActive: boolean }> = {};
  for (const o of overrides) overrideMap[o.intent] = { overrideOffer: o.overrideOffer, isActive: o.isActive };

  const defaultMapping: Record<string, string> = {
    art_commission: "Art Commission Deposit",
    sales_consultation: "1:1 Creator Session",
    sales_service: "AI Brand Audit",
    app_interest: "AI Brand Audit",
    book_interest: "Premium Content Strategy",
    music_interest: "Creative Review",
    support_request: "1:1 Creator Session",
    general_brand: "AI Brand Audit",
  };

  // Compute overall offer stats
  const totalRecommended = Object.values(perOffer).reduce((s, o) => s + o.recommended, 0);
  const totalAccepted = Object.values(perOffer).reduce((s, o) => s + o.accepted, 0);
  const overallRate = totalRecommended > 0 ? Math.round((totalAccepted / totalRecommended) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="lux-card text-center">
          <p className="text-2xl font-bold text-[#F4A62A]">{totalRecommended}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Times Recommended</p>
        </div>
        <div className="lux-card text-center">
          <p className="text-2xl font-bold text-green-400">{totalAccepted}</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Accepted</p>
        </div>
        <div className="lux-card text-center">
          <p className={`text-2xl font-bold ${overallRate >= 30 ? "text-green-400" : overallRate >= 15 ? "text-yellow-400" : "text-red-400"}`}>{overallRate}%</p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">Acceptance Rate</p>
        </div>
      </div>

      {/* Per-Offer performance cards */}
      <div>
        <p className="text-sm font-bold text-white/80 mb-3">Offer Performance</p>
        {Object.keys(perOffer).length === 0 ? (
          <div className="lux-card text-center py-8">
            <Tag className="h-7 w-7 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No offer recommendation data yet. Once visitors engage via the concierge, offer stats will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(perOffer).sort((a, b) => b[1].acceptanceRate - a[1].acceptanceRate).map(([offer, stats]) => (
              <div key={offer} className="lux-card border border-white/6 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-white leading-snug">{offer}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    stats.acceptanceRate >= 50 ? "bg-green-500/15 text-green-400"
                      : stats.acceptanceRate >= 25 ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-red-500/15 text-red-400"
                  }`}>{stats.acceptanceRate}%</span>
                </div>
                <div className="flex gap-4 text-[10px] text-white/40">
                  <span>{stats.recommended} recommended</span>
                  <span>{stats.accepted} accepted</span>
                </div>
                {/* Mini progress bar */}
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stats.acceptanceRate >= 50 ? "bg-green-400" : stats.acceptanceRate >= 25 ? "bg-yellow-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(100, stats.acceptanceRate)}%` }}
                  />
                </div>
                {stats.intents.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {stats.intents.slice(0, 4).map((i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/6 text-white/40 capitalize">
                        {i.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intent → Offer mapping editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white/80">Intent → Offer Mapping</p>
          <p className="text-[10px] text-white/30">Click "Override" to change which offer is recommended for each detected intent</p>
        </div>
        <div className="lux-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-4 py-3 text-white/40 font-medium">Intent</th>
                  <th className="text-left px-4 py-3 text-white/40 font-medium">Current Offer</th>
                  <th className="text-center px-4 py-3 text-white/40 font-medium">Shown</th>
                  <th className="text-center px-4 py-3 text-white/40 font-medium">Rate</th>
                  <th className="text-left px-4 py-3 text-white/40 font-medium">Data Suggests</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ALL_INTENTS.map((intent) => {
                  const intentData = perIntent[intent];
                  const override = overrideMap[intent];
                  const isOverridden = !!override?.overrideOffer;
                  const overrideActive = override?.isActive ?? false;
                  const currentOffer = (isOverridden && overrideActive) ? override.overrideOffer : defaultMapping[intent] ?? "—";
                  const suggestedOffer = intentData?.suggestedOffer;
                  const hasBetterSuggestion = suggestedOffer && suggestedOffer !== currentOffer && (intentData?.acceptanceRate ?? 0) > 0;
                  const rate = intentData?.acceptanceRate ?? 0;
                  const recommended = intentData?.recommended ?? 0;
                  const isEditing = editingIntent === intent;

                  return (
                    <tr key={intent} className={`border-b border-white/6 last:border-0 ${hasBetterSuggestion ? "bg-yellow-500/3" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="capitalize text-white/80 font-medium">{intent.replace(/_/g, " ")}</span>
                          {isOverridden && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${overrideActive ? "bg-[#F4A62A]/15 text-[#F4A62A]" : "bg-white/8 text-white/30"}`}>
                              {overrideActive ? "Override" : "Paused"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/60">{currentOffer}</td>
                      <td className="px-4 py-3 text-center text-white/50">{recommended > 0 ? recommended : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {recommended > 0 ? (
                          <span className={`font-semibold ${rate >= 50 ? "text-green-400" : rate >= 25 ? "text-yellow-400" : "text-red-400"}`}>{rate}%</span>
                        ) : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {hasBetterSuggestion ? (
                          <span className="text-yellow-400 text-[10px]">⚡ {suggestedOffer}</span>
                        ) : <span className="text-white/20 text-[10px]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 min-w-[200px]">
                            <select
                              value={editOffer}
                              onChange={(e) => setEditOffer(e.target.value)}
                              className="flex-1 bg-white/8 text-white text-xs rounded-lg px-2 py-1 border border-white/15 focus:outline-none"
                            >
                              <option value="">Select offer…</option>
                              {ALL_OFFERS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <button
                              onClick={() => { if (editOffer) setOverrideMutation.mutate({ intent, offer: editOffer }); }}
                              disabled={!editOffer || setOverrideMutation.isPending}
                              className="text-[10px] px-2 py-1 rounded-lg bg-[#F4A62A]/15 text-[#F4A62A] hover:bg-[#F4A62A]/25 transition disabled:opacity-50"
                            >Save</button>
                            <button onClick={() => setEditingIntent(null)} className="text-[10px] text-white/30 hover:text-white/60">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => { setEditingIntent(intent); setEditOffer(currentOffer === "—" ? "" : currentOffer); }}
                              data-testid={`button-override-${intent}`}
                              className="text-[10px] px-2 py-1 rounded-lg bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/80 transition"
                            >Override</button>
                            {isOverridden && (
                              <>
                                <button
                                  onClick={() => toggleOverrideMutation.mutate({ intent, isActive: !overrideActive })}
                                  className={`text-[10px] px-2 py-1 rounded-lg transition ${overrideActive ? "bg-white/6 text-white/40 hover:bg-white/10" : "bg-[#F4A62A]/10 text-[#F4A62A] hover:bg-[#F4A62A]/20"}`}
                                >{overrideActive ? "Pause" : "Enable"}</button>
                                <button
                                  onClick={() => removeOverrideMutation.mutate(intent)}
                                  className="text-[10px] text-red-400/60 hover:text-red-400 transition"
                                >✕</button>
                              </>
                            )}
                            {hasBetterSuggestion && !isOverridden && (
                              <button
                                onClick={() => { setOverrideMutation.mutate({ intent, offer: suggestedOffer! }); }}
                                disabled={setOverrideMutation.isPending}
                                className="text-[10px] px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition"
                              >Apply ⚡</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-white/25 mt-2">⚡ = data-driven suggestion based on actual acceptance rates from past conversations.</p>
      </div>
    </div>
  );
}

function FunnelTab() {
  const funnelQ = useQuery<FunnelData>({
    queryKey: ["/api/dashboard/funnel"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/funnel");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });
  const conversionQ = useQuery<ConversionData>({
    queryKey: ["/api/dashboard/conversion"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/conversion");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const funnel = funnelQ.data;
  const conversion = conversionQ.data;

  return (
    <div className="space-y-6">
      {/* Section 1 — Conversion Funnel */}
      <div className="lux-card space-y-5">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#F4A62A]" />
          <h3 className="text-base font-bold text-white font-heading">Conversion Funnel</h3>
          <span className="ml-auto text-xs text-white/30">All time · Chat → Revenue</span>
        </div>
        {!funnel ? (
          <div className="text-center py-6 text-white/30 text-sm">Loading funnel data…</div>
        ) : (
          <div className="space-y-3">
            {funnel.stages.map((stage, i) => {
              const color = STAGE_COLORS[stage.name] ?? "#F4A62A";
              const prevStage = i > 0 ? funnel.stages[i - 1] : null;
              const dropOff = prevStage && prevStage.count > 0
                ? Math.round(((prevStage.count - stage.count) / prevStage.count) * 100)
                : null;
              return (
                <div key={stage.name} data-testid={`funnel-stage-${i}`}>
                  {dropOff !== null && dropOff > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-white/25 ml-2 mb-1">
                      <TrendingDown className="h-3 w-3" />
                      <span>{dropOff}% drop-off</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-xs text-white/60 font-medium">{stage.name}</span>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(stage.rate, 3)}%`, backgroundColor: color + "33", borderRight: `2px solid ${color}` }}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right">
                      <span className="text-sm font-bold" style={{ color }}>{stage.count}</span>
                      <span className="text-xs text-white/30 ml-1">({stage.rate}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2 — Intent × Outcome Conversion Table */}
      <div className="lux-card space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[#F4A62A]" />
          <h3 className="text-base font-bold text-white font-heading">Intent → Outcome Conversion</h3>
        </div>
        {!conversion ? (
          <div className="text-center py-6 text-white/30 text-sm">Loading…</div>
        ) : Object.keys(conversion.byIntent).length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No intent data yet. Start conversations to see conversion rates.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="table-intent-conversion">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left py-2 px-2 text-white/40 font-medium">Intent</th>
                  <th className="text-right py-2 px-2 text-white/40 font-medium">Sessions</th>
                  <th className="text-right py-2 px-2 text-white/40 font-medium">Qualified</th>
                  <th className="text-right py-2 px-2 text-white/40 font-medium">Booked</th>
                  <th className="text-right py-2 px-2 text-white/40 font-medium">Won</th>
                  <th className="text-right py-2 px-2 text-white/40 font-medium">Offer Accept</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(conversion.byIntent)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([intent, row]) => {
                    const color = INTENT_HEX[intent] ?? "#94a3b8";
                    return (
                      <tr key={intent} className="border-b border-white/5 hover:bg-white/2" data-testid={`row-intent-${intent}`}>
                        <td className="py-2.5 px-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: color + "20", color }}>
                            {intent.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="text-right py-2.5 px-2 text-white/70">{row.total}</td>
                        <td className="text-right py-2.5 px-2">
                          <span className="text-green-400">{row.qualified}</span>
                          <span className="text-white/30 ml-1">({row.qualifiedRate}%)</span>
                        </td>
                        <td className="text-right py-2.5 px-2">
                          <span className="text-orange-400">{row.booked}</span>
                          <span className="text-white/30 ml-1">({row.bookedRate}%)</span>
                        </td>
                        <td className="text-right py-2.5 px-2">
                          <span className="text-[#F4A62A]">{row.won}</span>
                          <span className="text-white/30 ml-1">({row.wonRate}%)</span>
                        </td>
                        <td className="text-right py-2.5 px-2">
                          {row.offered > 0 ? (
                            <>
                              <span className={row.offerAcceptanceRate >= 50 ? "text-green-400" : "text-white/50"}>
                                {row.accepted}/{row.offered}
                              </span>
                              <span className="text-white/30 ml-1">({row.offerAcceptanceRate}%)</span>
                            </>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3 — Offer Acceptance Metrics */}
      <div className="lux-card space-y-4">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-[#F4A62A]" />
          <h3 className="text-base font-bold text-white font-heading">Offer Recommendation Acceptance</h3>
          <span className="ml-auto text-xs text-white/30">AI recommended vs visitor chose</span>
        </div>
        {!conversion ? (
          <div className="text-center py-6 text-white/30 text-sm">Loading…</div>
        ) : Object.keys(conversion.offerAcceptance).length === 0 ? (
          <div className="text-center py-8">
            <Flame className="h-8 w-8 text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No offer recommendations tracked yet.</p>
            <p className="text-white/20 text-xs mt-1">The AI concierge will start recommending offers as leads qualify.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(conversion.offerAcceptance)
              .sort(([, a], [, b]) => b.timesRecommended - a.timesRecommended)
              .map(([offer, row]) => {
                const rate = row.acceptanceRate;
                const rateColor = rate >= 60 ? "#22c55e" : rate >= 30 ? "#F4A62A" : "#f43f5e";
                return (
                  <div key={offer} className="border border-white/8 rounded-xl p-4 space-y-3" data-testid={`card-offer-${offer}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{offer}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          Recommended {row.timesRecommended}× · Accepted {row.timesAccepted}×
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold" style={{ color: rateColor }}>{rate}%</p>
                        <p className="text-xs text-white/30">acceptance</p>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(rate, 2)}%`, backgroundColor: rateColor }}
                      />
                    </div>
                    {/* Source breakdown */}
                    {row.timesAccepted > 0 && (
                      <div className="flex gap-3 flex-wrap">
                        {Object.entries(row.bySource)
                          .filter(([, count]) => count > 0)
                          .map(([src, count]) => (
                            <span key={src} className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/50">
                              {src}: {count}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Section 4 — Consultation Win Rates */}
      <div className="lux-card space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#F4A62A]" />
          <h3 className="text-base font-bold text-white font-heading">Consultation Win Rates</h3>
          <span className="ml-auto text-xs text-white/30">Booked → Confirmed / Completed</span>
        </div>
        {!conversion ? (
          <div className="text-center py-6 text-white/30 text-sm">Loading…</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(conversion.byConsultation)
              .filter(([, row]) => row.total > 0)
              .sort(([, a], [, b]) => b.total - a.total)
              .length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No bookings yet for any consultation type.</p>
            ) : (
              Object.entries(conversion.byConsultation)
                .filter(([, row]) => row.total > 0)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([id, row]) => {
                  const rate = row.confirmRate;
                  return (
                    <div key={id} className="flex items-center gap-3" data-testid={`row-consult-${id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 truncate">{row.title}</p>
                        <p className="text-xs text-white/30">{row.total} booked · {row.confirmed} confirmed</p>
                      </div>
                      <div className="w-28 shrink-0">
                        <div className="bg-white/5 rounded-full h-2 overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(rate, 2)}%`, backgroundColor: rate >= 70 ? "#22c55e" : rate >= 40 ? "#F4A62A" : "#f43f5e" }}
                          />
                        </div>
                      </div>
                      <div className="w-10 text-right shrink-0">
                        <span className="text-sm font-bold" style={{ color: rate >= 70 ? "#22c55e" : rate >= 40 ? "#F4A62A" : "#f43f5e" }}>{rate}%</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 45 — System Health & Audit Tab

type HealthData = {
  status: "healthy" | "degraded";
  checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }>;
  timestamp: string;
};

type SystemHealthSummary = {
  lastLeadAt: string | null;
  lastDigestAt: string | null;
  totalLeads: number;
  totalPaidOrders: number;
  totalAuditActions: number;
};

type AuditLogRow = {
  id: number;
  actorLabel: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  meta: any;
  createdAt: string;
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function SystemTab() {
  const healthQ = useQuery<HealthData>({
    queryKey: ["/api/health"],
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const summaryQ = useQuery<SystemHealthSummary>({
    queryKey: ["/api/dashboard/system-health"],
    staleTime: 30_000,
  });

  const auditQ = useQuery<AuditLogRow[]>({
    queryKey: ["/api/dashboard/audit-logs"],
    staleTime: 15_000,
  });

  const health = healthQ.data;
  const summary = summaryQ.data;
  const auditLogs = auditQ.data ?? [];

  const CHECK_LABELS: Record<string, string> = {
    database: "PostgreSQL Database",
    openai: "OpenAI API",
    resend: "Resend Email",
    stripe: "Stripe Payments",
  };

  const daysSinceLead = daysSince(summary?.lastLeadAt ?? null);
  const daysSinceDigest = daysSince(summary?.lastDigestAt ?? null);

  const ACTION_COLORS: Record<string, string> = {
    dashboard_login: "#22c55e",
    dashboard_login_failed: "#ef4444",
    followup_sent: "#6366f1",
    offer_override_removed: "#f59e0b",
    offer_override_set: "#F4A62A",
  };

  return (
    <div className="space-y-6" data-testid="system-tab">

      {/* ── Health Check Panel ── */}
      <div className="lux-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#F4A62A]" /> Service Health
          </h3>
          <div className="flex items-center gap-2">
            {health ? (
              health.status === "healthy"
                ? <span className="flex items-center gap-1 text-xs text-green-400"><ShieldCheck className="h-3.5 w-3.5" /> All systems go</span>
                : <span className="flex items-center gap-1 text-xs text-red-400"><ShieldAlert className="h-3.5 w-3.5" /> Degraded</span>
            ) : (
              <span className="text-xs text-white/30">Checking…</span>
            )}
            <button
              data-testid="btn-refresh-health"
              onClick={() => healthQ.refetch()}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${healthQ.isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(CHECK_LABELS).map(([key, label]) => {
            const check = health?.checks[key];
            return (
              <div key={key} className="lux-card p-3 flex items-center gap-3" data-testid={`health-check-${key}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${check === undefined ? "bg-white/20" : check.ok ? "bg-green-400 shadow-[0_0_8px_#22c55e]" : "bg-red-400 shadow-[0_0_8px_#ef4444]"}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/80 truncate">{label}</p>
                  <p className="text-[10px] text-white/30">
                    {check === undefined ? "—" : check.ok ? (check.latencyMs !== undefined ? `${check.latencyMs}ms` : "OK") : (check.detail ?? "Error")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {health && (
          <p className="text-[10px] text-white/20 mt-3 text-right">Last checked: {new Date(health.timestamp).toLocaleTimeString()}</p>
        )}
      </div>

      {/* ── System Stats + Stale Alerts ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="lux-panel p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-[#F4A62A]" /> Platform Stats
          </h3>
          {summaryQ.isLoading ? (
            <p className="text-white/30 text-xs text-center py-4">Loading…</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Total Chat Leads", value: summary?.totalLeads ?? 0, color: "#6366f1" },
                { label: "Paid Orders", value: summary?.totalPaidOrders ?? 0, color: "#22c55e" },
                { label: "Audit Events", value: summary?.totalAuditActions ?? 0, color: "#F4A62A" },
                { label: "Days Since Last Lead", value: daysSinceLead !== null ? `${daysSinceLead}d` : "No data", color: daysSinceLead !== null && daysSinceLead > 7 ? "#ef4444" : "#94a3b8" },
                { label: "Days Since Last Digest", value: daysSinceDigest !== null ? `${daysSinceDigest}d` : "No data", color: daysSinceDigest !== null && daysSinceDigest > 3 ? "#f59e0b" : "#94a3b8" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center" data-testid={`system-stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
                  <span className="text-xs text-white/50">{s.label}</span>
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lux-panel p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#F4A62A]" /> Rate Limits (per minute)
          </h3>
          <div className="space-y-3">
            {[
              { route: "/api/chat", limit: "15 req/min", icon: "💬", note: "AI Concierge" },
              { route: "/api/contact", limit: "5 req/min", icon: "📩", note: "Contact Form" },
              { route: "/api/newsletter", limit: "3 req/min", icon: "📬", note: "Newsletter Signup" },
            ].map((r) => (
              <div key={r.route} className="lux-card p-3" data-testid={`rate-limit-${r.route.replace("/api/", "")}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">{r.icon} {r.note}</span>
                  <span className="text-xs font-bold text-[#F4A62A]">{r.limit}</span>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5 font-mono">{r.route}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stale Data Warnings ── */}
      {((daysSinceLead !== null && daysSinceLead > 7) || (daysSinceDigest !== null && daysSinceDigest > 3)) && (
        <div className="space-y-2">
          {daysSinceLead !== null && daysSinceLead > 7 && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl p-3" data-testid="alert-stale-leads">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-300">No new leads in {daysSinceLead} days</p>
                <p className="text-[10px] text-white/40 mt-0.5">Consider sharing your brand link or running a promotion to attract new visitors.</p>
              </div>
            </div>
          )}
          {daysSinceDigest !== null && daysSinceDigest > 3 && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3" data-testid="alert-stale-digest">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-300">Intelligence digest is {daysSinceDigest} days old</p>
                <p className="text-[10px] text-white/40 mt-0.5">Generate a new digest from the Intelligence tab to refresh your AI insights.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Log ── */}
      <div className="lux-panel p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FileBarChart2 className="h-4 w-4 text-[#F4A62A]" /> Recent Audit Log
        </h3>
        {auditQ.isLoading ? (
          <p className="text-white/30 text-xs text-center py-4">Loading…</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-4">No audit events recorded yet. Login events, follow-ups, and offer changes will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/10">
                  <th className="text-left pb-2 pr-3">Action</th>
                  <th className="text-left pb-2 pr-3">Resource</th>
                  <th className="text-left pb-2 pr-3">Actor</th>
                  <th className="text-right pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 30).map((log) => {
                  const clr = ACTION_COLORS[log.action] ?? "#94a3b8";
                  return (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`audit-row-${log.id}`}>
                      <td className="py-2 pr-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${clr}22`, color: clr }}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-white/40 truncate max-w-[100px]">{log.resourceType ?? "—"}{log.resourceId ? ` · ${log.resourceId.slice(0, 12)}` : ""}</td>
                      <td className="py-2 pr-3 text-white/40">{log.actorLabel}</td>
                      <td className="py-2 text-right text-white/30 whitespace-nowrap">{new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 44 — Revenue Attribution Tab

type RevAttribData = {
  monthlySeries: { month: string; stripeRevenue: number; wonRevenue: number; total: number }[];
  byOffer: { name: string; revenue: number; count: number; avgValue: number }[];
  byIntent: { intent: string; revenue: number; count: number }[];
  bySource: { source: string; revenue: number; count: number }[];
  topPaths: { intent: string; offer: string; revenue: number; count: number }[];
  totals: { stripeRevenue: number; wonRevenue: number; combinedRevenue: number; paidOrders: number; wonDeals: number; avgOrderValue: number };
};

function fmt$(cents: number) {
  if (cents === 0) return "$0";
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${(cents / 100).toFixed(2)}`;
}

function RevBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
    </div>
  );
}

function RevenueTab() {
  const qc = useQueryClient();

  const q = useQuery<RevAttribData>({
    queryKey: ["/api/dashboard/revenue-attribution"],
    staleTime: 60_000,
  });

  const recoveryActionsQ = useQuery<RevenueRecoveryAction[]>({
    queryKey: ["automation-recovery-actions"],
    queryFn: () => authedJson("/api/automation/revenue-recovery/actions"),
  });

  const patchRecoveryAction = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RevenueRecoveryAction["status"] }) =>
      authedJson(`/api/automation/revenue-recovery/actions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-recovery-actions"] }),
  });

  if (q.isLoading) {
    return (
      <div className="lux-panel p-8 text-center text-white/40 text-sm" data-testid="revenue-loading">
        <RefreshCw className="animate-spin h-5 w-5 mx-auto mb-2" /> Loading revenue data…
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="lux-panel p-6 text-center text-red-400 text-sm" data-testid="revenue-error">
        Could not load revenue attribution data.
      </div>
    );
  }

  const d = q.data;
  const { totals, monthlySeries, byOffer, byIntent, bySource, topPaths } = d;

  const maxOffer   = Math.max(...byOffer.map((o) => o.revenue), 1);
  const maxIntent  = Math.max(...byIntent.map((i) => i.revenue), 1);
  const maxSource  = Math.max(...bySource.map((s) => s.revenue), 1);

  const INTENT_CLR: Record<string, string> = {
    app_support: "#6366f1", coaching: "#f59e0b", booking: "#22c55e",
    music: "#ec4899", books: "#3b82f6", art: "#a855f7", pricing: "#f97316",
    general: "#94a3b8", direct: "#F4A62A",
  };

  return (
    <div className="space-y-6" data-testid="revenue-tab">

      {/* ── Totals strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Combined Revenue", value: fmt$(totals.combinedRevenue), sub: "Stripe + Won deals", color: "#F4A62A" },
          { label: "Stripe Revenue",   value: fmt$(totals.stripeRevenue),   sub: `${totals.paidOrders} paid orders`, color: "#22c55e" },
          { label: "Won Deal Revenue", value: fmt$(totals.wonRevenue),      sub: `${totals.wonDeals} closed deals`, color: "#6366f1" },
          { label: "Avg Order Value",  value: fmt$(totals.avgOrderValue),   sub: "Stripe only", color: "#f59e0b" },
          { label: "Paid Orders",      value: String(totals.paidOrders),    sub: "via Stripe checkout", color: "#3b82f6" },
          { label: "Won Deals",        value: String(totals.wonDeals),      sub: "pipeline conversions", color: "#ec4899" },
        ].map((s) => (
          <div key={s.label} className="lux-card p-4" data-testid={`revenue-stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
            <p className="text-xs text-white/40 mb-1">{s.label}</p>
            <p className="text-2xl font-bold font-heading" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Monthly trend ── */}
      <div className="lux-panel p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-[#F4A62A]" /> Monthly Revenue (Last 6 Months)
        </h3>
        {totals.combinedRevenue === 0 ? (
          <p className="text-white/30 text-xs text-center py-6">No revenue recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlySeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: "hsl(220 50% 14%)", border: "1px solid rgba(244,166,42,0.25)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                formatter={(value: number, name: string) => [`$${(value / 100).toFixed(2)}`, name === "stripeRevenue" ? "Stripe" : "Won Deals"]}
              />
              <Legend formatter={(v) => v === "stripeRevenue" ? "Stripe Revenue" : "Won Deals"} wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
              <Bar dataKey="stripeRevenue" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
              <Bar dataKey="wonRevenue"    stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── By Offer + By Source ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* By Offer */}
        <div className="lux-panel p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#F4A62A]" /> Revenue by Offer
          </h3>
          {byOffer.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-4">No paid orders yet.</p>
          ) : (
            <div className="space-y-3">
              {byOffer.map((o) => (
                <div key={o.name} data-testid={`revenue-offer-${o.name}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-white/70 truncate max-w-[60%]">{o.name}</span>
                    <span className="text-xs font-bold text-[#F4A62A]">{fmt$(o.revenue)}</span>
                  </div>
                  <RevBar pct={(o.revenue / maxOffer) * 100} color="#F4A62A" />
                  <p className="text-[10px] text-white/30 mt-0.5">{o.count} orders · avg {fmt$(o.avgValue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Source */}
        <div className="lux-panel p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-[#F4A62A]" /> Revenue by Source
          </h3>
          {bySource.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-4">No attributed sources yet.</p>
          ) : (
            <div className="space-y-3">
              {bySource.map((s) => (
                <div key={s.source} data-testid={`revenue-source-${s.source}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-white/70 capitalize">{s.source || "direct"}</span>
                    <span className="text-xs font-bold text-[#22c55e]">{fmt$(s.revenue)}</span>
                  </div>
                  <RevBar pct={(s.revenue / maxSource) * 100} color="#22c55e" />
                  <p className="text-[10px] text-white/30 mt-0.5">{s.count} orders</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── By Intent ── */}
      <div className="lux-panel p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-[#F4A62A]" /> Revenue by Visitor Intent
        </h3>
        {byIntent.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-4">No intent data yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {byIntent.map((item) => {
              const clr = INTENT_CLR[item.intent] ?? "#94a3b8";
              return (
                <div key={item.intent} className="lux-card p-3" data-testid={`revenue-intent-${item.intent}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold capitalize" style={{ color: clr }}>{item.intent.replace("_", " ")}</span>
                    <span className="text-xs font-bold text-white">{fmt$(item.revenue)}</span>
                  </div>
                  <RevBar pct={(item.revenue / maxIntent) * 100} color={clr} />
                  <p className="text-[10px] text-white/30 mt-1">{item.count} orders / deals</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top Attribution Paths ── */}
      {topPaths.length > 0 && (
        <div className="lux-panel p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#F4A62A]" /> Top Attribution Paths (Intent → Offer)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/10">
                  <th className="text-left pb-2 pr-4">Intent</th>
                  <th className="text-left pb-2 pr-4">Offer</th>
                  <th className="text-right pb-2 pr-4">Revenue</th>
                  <th className="text-right pb-2">Orders</th>
                </tr>
              </thead>
              <tbody>
                {topPaths.map((p, i) => {
                  const clr = INTENT_CLR[p.intent] ?? "#94a3b8";
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5" data-testid={`revenue-path-${i}`}>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${clr}22`, color: clr }}>
                          {p.intent.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-white/60 truncate max-w-[140px]">{p.offer}</td>
                      <td className="py-2 pr-4 text-right font-bold text-[#F4A62A]">{fmt$(p.revenue)}</td>
                      <td className="py-2 text-right text-white/40">{p.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Phase 49: Revenue Recovery Queue ── */}
      <RecoveryQueueTable
        rows={recoveryActionsQ.data || []}
        onMark={(id, status) => patchRecoveryAction.mutate({ id, status })}
      />
    </div>
  );
}

// ── Phase 48 — Automation Tab ─────────────────────────────────────────────────

type AutomationSettings = {
  auto_followup_enabled: string;
  auto_followup_min_score: string;
  auto_followup_max_per_day: string;
  auto_followup_max_per_lead: string;
  auto_followup_interval_hours: string;
};

type EngineStatus = {
  running: boolean;
  lastRunAt: string | null;
  lastRunResult: { sent: number; skipped: number; errors: number } | null;
};

function AutomationTab() {
  const qc = useQueryClient();

  const settingsQ = useQuery<AutomationSettings>({
    queryKey: ["/api/dashboard/automation/settings"],
    queryFn: () => fetch("/api/dashboard/automation/settings").then((r) => r.json()),
  });

  const statusQ = useQuery<EngineStatus>({
    queryKey: ["/api/dashboard/automation/status"],
    queryFn: () => fetch("/api/dashboard/automation/status").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const logQ = useQuery<{ id: number; resourceId: string | null; meta: any; createdAt: string }[]>({
    queryKey: ["/api/dashboard/automation/log"],
    queryFn: () => fetch("/api/dashboard/automation/log").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const [localSettings, setLocalSettings] = useState<AutomationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ sent: number; skipped: number; errors: number } | null>(null);

  const p49JobsQ = useQuery<AutomationJob[]>({
    queryKey: ["automation-jobs"],
    queryFn: () => authedJson("/api/automation/jobs"),
    refetchInterval: 60_000,
  });

  const p49RecoveryStatusQ = useQuery<RevenueRecoveryStatus>({
    queryKey: ["automation-recovery-status"],
    queryFn: () => authedJson("/api/automation/revenue-recovery/status"),
    refetchInterval: 120_000,
  });

  const p49RecoveryActionsQ = useQuery<RevenueRecoveryAction[]>({
    queryKey: ["automation-recovery-actions"],
    queryFn: () => authedJson("/api/automation/revenue-recovery/actions"),
  });

  const p49AlertsQ = useQuery<AutonomousAlert[]>({
    queryKey: ["autonomous-alerts"],
    queryFn: () => authedJson("/api/audit/autonomous-alerts"),
    refetchInterval: 120_000,
  });

  const p49FounderBriefQ = useQuery<DigestReportLite | null>({
    queryKey: ["founder-brief-latest"],
    queryFn: () => authedJson("/api/digest/founder-brief/latest"),
  });

  const runRecoveryNow = useMutation({
    mutationFn: () => authedJson("/api/automation/revenue-recovery/run-now", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-recovery-status"] });
      qc.invalidateQueries({ queryKey: ["automation-recovery-actions"] });
      qc.invalidateQueries({ queryKey: ["automation-jobs"] });
    },
  });

  const generateContentOpsAuto = useMutation({
    mutationFn: () => authedJson("/api/automation/content-opportunities/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-content-opportunities"] }),
  });

  const generateFounderBriefAuto = useMutation({
    mutationFn: () => authedJson("/api/digest/founder-brief/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["founder-brief-latest"] }),
  });

  const runAutonomousChecks = useMutation({
    mutationFn: () => authedJson("/api/audit/run-autonomous-checks", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autonomous-alerts"] }),
  });

  const patchRecoveryActionAuto = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RevenueRecoveryAction["status"] }) =>
      authedJson(`/api/automation/revenue-recovery/actions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-recovery-actions"] }),
  });

  const patchAlertAuto = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AutonomousAlert["status"] }) =>
      authedJson(`/api/audit/autonomous-alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autonomous-alerts"] }),
  });

  const s = localSettings ?? settingsQ.data;
  const enabled = s?.auto_followup_enabled === "true";

  function patch(key: keyof AutomationSettings, val: string) {
    setLocalSettings((prev) => ({ ...(prev ?? settingsQ.data!), [key]: val }));
  }

  async function saveSettings() {
    if (!localSettings) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await fetch("/api/dashboard/automation/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings),
      });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/automation/settings"] });
      setSaveMsg("Saved!");
    } catch {
      setSaveMsg("Error saving.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  async function runNow() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/dashboard/automation/run-now", { method: "POST" });
      const data = await res.json();
      setRunResult(data);
      qc.invalidateQueries({ queryKey: ["/api/dashboard/automation/status"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/automation/log"] });
    } catch {
      setRunResult({ sent: 0, skipped: 0, errors: 1 });
    } finally {
      setRunning(false);
    }
  }

  const status = statusQ.data;
  const logs = logQ.data ?? [];

  return (
    <div className="space-y-6" data-testid="panel-automation">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">AI Follow-Up Automation</h2>
          <p className="text-sm text-white/45 mt-0.5">Automatically sends personalized follow-up emails to overdue hot leads via OpenAI + Resend.</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${enabled ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-white/10 bg-white/5 text-white/30"}`}>
          {enabled ? "● Active" : "○ Paused"}
        </div>
      </div>

      {settingsQ.isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}
        </div>
      ) : s ? (
        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="lux-card flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">Enable Automation</p>
              <p className="text-xs text-white/40 mt-0.5">When on, the engine runs every {s.auto_followup_interval_hours}h and auto-sends follow-ups.</p>
            </div>
            <button
              data-testid="toggle-auto-followup"
              onClick={() => patch("auto_followup_enabled", enabled ? "false" : "true")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-[#F4A62A]" : "bg-white/15"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Config grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: "auto_followup_min_score" as const, label: "Min Lead Score", min: 1, max: 100, hint: "Only scores ≥ this get emailed" },
              { key: "auto_followup_max_per_day" as const, label: "Max Sends / Day", min: 1, max: 50, hint: "Daily cap across all leads" },
              { key: "auto_followup_max_per_lead" as const, label: "Max / Lead", min: 1, max: 10, hint: "Lifetime cap per lead" },
              { key: "auto_followup_interval_hours" as const, label: "Cycle (hours)", min: 1, max: 72, hint: "How often the engine checks" },
            ].map(({ key, label, min, max, hint }) => (
              <div key={key} className="rounded-xl border border-white/8 bg-white/3 p-3">
                <label className="text-[11px] text-white/40 uppercase tracking-wide font-medium block mb-1">{label}</label>
                <input
                  data-testid={`input-${key}`}
                  type="number"
                  min={min}
                  max={max}
                  value={s[key]}
                  onChange={(e) => patch(key, e.target.value)}
                  className="w-full bg-transparent text-white text-xl font-bold outline-none [appearance:textfield]"
                />
                <p className="text-[10px] text-white/25 mt-1 leading-tight">{hint}</p>
              </div>
            ))}
          </div>

          {/* Save + Run Now */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              data-testid="button-save-automation"
              onClick={saveSettings}
              disabled={saving || !localSettings}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
            <button
              data-testid="button-run-now"
              onClick={runNow}
              disabled={running}
              className="btn-secondary text-sm px-5 py-2 flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" />
              {running ? "Running…" : "Run Now"}
            </button>
            {saveMsg && <span className="text-xs text-green-400">{saveMsg}</span>}
            {runResult && (
              <span className="text-xs text-white/60">
                Last run: <span className="text-green-400">{runResult.sent} sent</span>
                {runResult.skipped > 0 && <> · {runResult.skipped} skipped</>}
                {runResult.errors > 0 && <> · <span className="text-red-400">{runResult.errors} errors</span></>}
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Engine status */}
      {status && (
        <div className="lux-card flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-wide font-medium">Last Run</p>
            <p className="text-white font-semibold mt-0.5">
              {status.lastRunAt ? new Date(status.lastRunAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
            </p>
          </div>
          {status.lastRunResult && (
            <>
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wide font-medium">Sent</p>
                <p className="text-green-400 font-bold text-lg">{status.lastRunResult.sent}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wide font-medium">Skipped</p>
                <p className="text-white/50 font-semibold text-lg">{status.lastRunResult.skipped}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wide font-medium">Errors</p>
                <p className={`font-bold text-lg ${status.lastRunResult.errors > 0 ? "text-red-400" : "text-white/30"}`}>{status.lastRunResult.errors}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Auto-send log */}
      <div>
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">Recent Auto-Sends</h3>
        {logs.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-center text-white/30 text-sm">
            No automated follow-ups sent yet. Enable the engine and run a cycle to start.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const m = log.meta as { toEmail?: string; subject?: string; daysSilent?: number } | null;
              return (
                <div key={log.id} className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{m?.subject ?? "Follow-up email"}</p>
                    <p className="text-xs text-white/35 mt-0.5">{m?.toEmail ?? log.resourceId} · {m?.daysSilent != null ? `${m.daysSilent}d silent` : ""}</p>
                  </div>
                  <p className="text-xs text-white/25 shrink-0 mt-0.5">
                    {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Phase 49: Autonomous Operation Layer ── */}
      <AutomationSummaryCards
        activeJobs={(p49JobsQ.data || []).filter((x) => x.status === "running").length}
        failedJobs24h={(p49JobsQ.data || []).filter((x) => x.status === "failed").length}
        recoveryOpen={p49RecoveryStatusQ.data?.openActions ?? 0}
        wonRecoveries30d={p49RecoveryStatusQ.data?.wonRecoveries30d ?? 0}
        openAlerts={(p49AlertsQ.data || []).filter((x) => x.status === "open").length}
        lastFounderBriefLabel={
          p49FounderBriefQ.data?.createdAt
            ? new Date(p49FounderBriefQ.data.createdAt).toLocaleDateString()
            : "—"
        }
        isLoading={p49JobsQ.isLoading || p49RecoveryStatusQ.isLoading || p49AlertsQ.isLoading}
      />

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-[#F4A62A] px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40 transition"
          onClick={() => runRecoveryNow.mutate()}
          disabled={runRecoveryNow.isPending}
          data-testid="button-run-recovery-now"
        >
          {runRecoveryNow.isPending ? "Running…" : "Run Revenue Recovery"}
        </button>
        <button
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
          onClick={() => generateContentOpsAuto.mutate()}
          disabled={generateContentOpsAuto.isPending}
          data-testid="button-generate-content-ops"
        >
          {generateContentOpsAuto.isPending ? "Generating…" : "Generate Content Opportunities"}
        </button>
        <button
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
          onClick={() => generateFounderBriefAuto.mutate()}
          disabled={generateFounderBriefAuto.isPending}
          data-testid="button-generate-founder-brief-auto"
        >
          {generateFounderBriefAuto.isPending ? "Generating…" : "Generate Founder Brief"}
        </button>
        <button
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 transition"
          onClick={() => runAutonomousChecks.mutate()}
          disabled={runAutonomousChecks.isPending}
          data-testid="button-run-autonomous-checks"
        >
          {runAutonomousChecks.isPending ? "Running…" : "Run Autonomous Checks"}
        </button>
      </div>

      <RecoveryQueueTable
        rows={(p49RecoveryActionsQ.data || []).slice(0, 8)}
        onMark={(id, status) => patchRecoveryActionAuto.mutate({ id, status })}
      />

      <AutonomousAlertsPanel
        rows={(p49AlertsQ.data || []).slice(0, 8)}
        onUpdate={(id, status) => patchAlertAuto.mutate({ id, status })}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"analytics" | "funnel" | "offers" | "revenue" | "voice" | "leads" | "contacts" | "newsletter" | "reviews" | "blog" | "knowledge" | "pipeline" | "bookings" | "orders" | "digest" | "automation" | "system" | "audit" | "growth" | "execution" | "founder">("analytics");
  const [leadFilter, setLeadFilter] = useState<"all" | "priority" | "hot" | "warm" | "cold">("all");
  const qc = useQueryClient();

  const leadsQuery = useQuery<Lead[]>({
    queryKey: ["/api/dashboard/leads", leadFilter],
    queryFn: async () => {
      const url = leadFilter === "all"
        ? "/api/dashboard/leads"
        : `/api/dashboard/leads?temperature=${leadFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  // Phase 50 — Growth Optimization queries
  const sourcePerformanceQ = useQuery<SourcePerformanceSnapshot[]>({
    queryKey: ["growth-source-performance"],
    queryFn: () => authedJson("/api/growth/source-performance"),
    enabled: tab === "growth" || tab === "analytics",
  });

  const funnelLeaksQ = useQuery<FunnelLeakReport[]>({
    queryKey: ["growth-funnel-leaks"],
    queryFn: () => authedJson("/api/growth/funnel-leaks"),
    enabled: tab === "growth" || tab === "funnel",
  });

  const offerPerformanceQ = useQuery<OfferPerformanceSnapshot[]>({
    queryKey: ["growth-offer-performance"],
    queryFn: () => authedJson("/api/growth/offer-performance"),
    enabled: tab === "growth" || tab === "offers",
  });

  const growthExperimentsQ = useQuery<GrowthExperiment[]>({
    queryKey: ["growth-experiments"],
    queryFn: () => authedJson("/api/growth/experiments"),
    enabled: tab === "growth",
  });

  const generateSourcePerformance = useMutation({
    mutationFn: () => authedJson("/api/growth/source-performance/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-source-performance"] }),
  });

  const generateFunnelLeaks = useMutation({
    mutationFn: () => authedJson("/api/growth/funnel-leaks/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-funnel-leaks"] }),
  });

  const generateOfferPerformance = useMutation({
    mutationFn: () => authedJson("/api/growth/offer-performance/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-offer-performance"] }),
  });

  const generateGrowthExperiments = useMutation({
    mutationFn: () => authedJson("/api/growth/experiments/generate", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-experiments"] }),
  });

  const patchGrowthExperiment = useMutation({
    mutationFn: ({ id, status }: { id: number; status: GrowthExperiment["status"] }) =>
      authedJson(`/api/growth/experiments/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-experiments"] }),
  });

  // ── Phase 51: Autonomous Execution queries ──────────────────────────────────
  const executionPoliciesQ = useQuery<ExecutionPolicy[]>({
    queryKey: ["execution-policies"],
    queryFn: () => authedJson("/api/execution/policies"),
    enabled: tab === "execution",
  });

  const executionQueueQ = useQuery<ExecutionQueueItem[]>({
    queryKey: ["execution-queue"],
    queryFn: () => authedJson("/api/execution/queue"),
    enabled: tab === "execution",
  });

  const appliedChangesQ = useQuery<AppliedChange[]>({
    queryKey: ["applied-changes"],
    queryFn: () => authedJson("/api/execution/applied-changes"),
    enabled: tab === "execution",
  });

  const rollbackEventsQ = useQuery<RollbackEvent[]>({
    queryKey: ["rollback-events"],
    queryFn: () => authedJson("/api/execution/rollbacks"),
    enabled: tab === "execution",
  });

  // ── Phase 52 queries ──────────────────────────────────────────────────────────
  const [p52Checking, setP52Checking] = useState(false);
  const [p52Generating, setP52Generating] = useState(false);
  const [p52RefreshingOverview, setP52RefreshingOverview] = useState(false);

  const founderOverviewQuery = useQuery<FounderOverview>({
    queryKey: ["founder-overview"],
    queryFn: () => authedJson("/api/founder/overview"),
    enabled: tab === "founder",
  });
  const maturityQuery = useQuery<MaturityScores>({
    queryKey: ["founder-maturity"],
    queryFn: () => authedJson("/api/founder/maturity-score"),
    enabled: tab === "founder",
  });
  const approvalRequestsQuery = useQuery<FounderApprovalRequest[]>({
    queryKey: ["founder-approval-requests"],
    queryFn: () => authedJson("/api/founder/approval-requests"),
    enabled: tab === "founder",
  });
  const healthSummaryQuery = useQuery<{ latest: SystemHealthSnapshot | null; history: SystemHealthSnapshot[] }>({
    queryKey: ["system-health-summary"],
    queryFn: () => authedJson("/api/system/health-summary"),
    enabled: tab === "founder",
  });
  const explanationsQuery = useQuery<AiExplanation[]>({
    queryKey: ["ai-explanations-recent"],
    queryFn: () => authedJson("/api/explainability/recent?limit=30"),
    enabled: tab === "founder",
  });
  const quarterlyQuery = useQuery<QuarterlyStrategyReport | null>({
    queryKey: ["quarterly-strategy-latest"],
    queryFn: () => authedJson("/api/strategy/quarterly/latest"),
    enabled: tab === "founder",
  });

  const approveRequest = useMutation({
    mutationFn: (id: number) => authedJson(`/api/founder/approval-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["founder-approval-requests"] }),
  });
  const rejectRequest = useMutation({
    mutationFn: (id: number) => authedJson(`/api/founder/approval-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["founder-approval-requests"] }),
  });

  const seedPolicies = useMutation({
    mutationFn: () => authedJson("/api/execution/policies/seed", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["execution-policies"] }),
  });

  const patchExecutionPolicy = useMutation({
    mutationFn: ({ key, patch }: { key: string; patch: Partial<ExecutionPolicy> }) =>
      authedJson(`/api/execution/policies/${key}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["execution-policies"] }),
  });

  const generateExecutionQueue = useMutation({
    mutationFn: () => authedJson("/api/execution/queue/generate", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["execution-queue"] });
      qc.invalidateQueries({ queryKey: ["applied-changes"] });
    },
  });

  const patchQueueItem = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<ExecutionQueueItem> }) =>
      authedJson(`/api/execution/queue/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["execution-queue"] }),
  });

  const applyNow = useMutation({
    mutationFn: () => authedJson("/api/execution/apply-now", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applied-changes"] });
      qc.invalidateQueries({ queryKey: ["execution-queue"] });
    },
  });

  const rollbackChange = useMutation({
    mutationFn: (id: number) => authedJson(`/api/execution/rollback/${id}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applied-changes"] });
      qc.invalidateQueries({ queryKey: ["rollback-events"] });
    },
  });

  const runRollbackCheck = useMutation({
    mutationFn: () => authedJson("/api/execution/rollback-check", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rollback-events"] });
      qc.invalidateQueries({ queryKey: ["applied-changes"] });
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

  const clicksQuery = useQuery<ClickStat[]>({
    queryKey: ["/api/dashboard/clicks"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/clicks");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const pageViewsQuery = useQuery<PageViewRecord[]>({
    queryKey: ["/api/dashboard/visits"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/visits");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const urgencyQuery = useQuery<{
    overdueHotLeads: number; newQualifiedLeads: number; pendingBookings: number;
    paidOrdersToday: number; unrepliedContacts: number; topRecommendedOffer: string | null;
  }>({
    queryKey: ["/api/dashboard/urgency"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/urgency");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const testimonialQuery = useQuery<Testimonial[]>({
    queryKey: ["/api/dashboard/testimonials"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/testimonials");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const leads = leadsQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];
  const subscribers = subscribersQuery.data ?? [];
  const clicks = clicksQuery.data ?? [];
  const pageViewData = pageViewsQuery.data ?? [];
  const allTestimonials = testimonialQuery.data ?? [];
  const capturedLeads = leads.filter((l) => l.leadEmail);

  const tabs = [
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "funnel", label: "Funnel", icon: Filter },
    { key: "offers", label: "Offers", icon: Tag },
    { key: "revenue", label: "Revenue", icon: Banknote },
    { key: "digest", label: "Intelligence", icon: BrainCircuit },
    { key: "voice", label: "Brand Voice", icon: Wand2 },
    { key: "leads", label: "Chat Leads", icon: MessageSquare },
    { key: "pipeline", label: "Pipeline", icon: TrendingUp },
    { key: "orders", label: "Orders", icon: DollarSign },
    { key: "bookings", label: "Bookings", icon: Calendar },
    { key: "knowledge", label: "Knowledge", icon: BookOpen },
    { key: "contacts", label: "Contacts", icon: Users },
    { key: "newsletter", label: "Newsletter", icon: Mail },
    { key: "reviews", label: "Reviews", icon: Star },
    { key: "blog", label: "Blog", icon: PenLine },
    { key: "automation", label: "Automation", icon: Zap },
    { key: "growth", label: "Growth", icon: FlaskConical },
    { key: "execution", label: "Execution", icon: Cpu },
    { key: "founder", label: "Founder", icon: Crown },
    { key: "system", label: "System", icon: Shield },
    { key: "audit", label: "Audit", icon: ClipboardCheck },
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

        {/* Summary metric cards */}
        <DashboardSummaryCards />

        {/* Urgency action row — Phase 41 */}
        {urgencyQuery.data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button
              onClick={() => setTab("leads")}
              data-testid="urgency-overdue-hot"
              className={`rounded-2xl px-4 py-3 text-left transition border ${urgencyQuery.data.overdueHotLeads > 0 ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15" : "bg-white/3 border-white/8"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className={`h-3.5 w-3.5 ${urgencyQuery.data.overdueHotLeads > 0 ? "text-red-400" : "text-white/25"}`} />
                <span className="text-xs text-white/50">Overdue Hot</span>
              </div>
              <p className={`text-xl font-bold ${urgencyQuery.data.overdueHotLeads > 0 ? "text-red-400" : "text-white/30"}`}>
                {urgencyQuery.data.overdueHotLeads}
              </p>
            </button>
            <button
              onClick={() => setTab("pipeline")}
              data-testid="urgency-new-qualified"
              className={`rounded-2xl px-4 py-3 text-left transition border ${urgencyQuery.data.newQualifiedLeads > 0 ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15" : "bg-white/3 border-white/8"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className={`h-3.5 w-3.5 ${urgencyQuery.data.newQualifiedLeads > 0 ? "text-green-400" : "text-white/25"}`} />
                <span className="text-xs text-white/50">New Qualified</span>
              </div>
              <p className={`text-xl font-bold ${urgencyQuery.data.newQualifiedLeads > 0 ? "text-green-400" : "text-white/30"}`}>
                {urgencyQuery.data.newQualifiedLeads}
              </p>
            </button>
            <button
              onClick={() => setTab("bookings")}
              data-testid="urgency-pending-bookings"
              className={`rounded-2xl px-4 py-3 text-left transition border ${urgencyQuery.data.pendingBookings > 0 ? "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15" : "bg-white/3 border-white/8"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className={`h-3.5 w-3.5 ${urgencyQuery.data.pendingBookings > 0 ? "text-orange-400" : "text-white/25"}`} />
                <span className="text-xs text-white/50">Pending Bookings</span>
              </div>
              <p className={`text-xl font-bold ${urgencyQuery.data.pendingBookings > 0 ? "text-orange-400" : "text-white/30"}`}>
                {urgencyQuery.data.pendingBookings}
              </p>
            </button>
            <button
              onClick={() => setTab("orders")}
              data-testid="urgency-paid-today"
              className={`rounded-2xl px-4 py-3 text-left transition border ${urgencyQuery.data.paidOrdersToday > 0 ? "bg-[#F4A62A]/10 border-[#F4A62A]/30 hover:bg-[#F4A62A]/15" : "bg-white/3 border-white/8"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className={`h-3.5 w-3.5 ${urgencyQuery.data.paidOrdersToday > 0 ? "text-[#F4A62A]" : "text-white/25"}`} />
                <span className="text-xs text-white/50">Paid Today</span>
              </div>
              <p className={`text-xl font-bold ${urgencyQuery.data.paidOrdersToday > 0 ? "text-[#F4A62A]" : "text-white/30"}`}>
                {urgencyQuery.data.paidOrdersToday}
              </p>
            </button>
            <button
              onClick={() => setTab("contacts")}
              data-testid="urgency-unreplied-contacts"
              className={`rounded-2xl px-4 py-3 text-left transition border ${urgencyQuery.data.unrepliedContacts > 0 ? "bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/15" : "bg-white/3 border-white/8"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Inbox className={`h-3.5 w-3.5 ${urgencyQuery.data.unrepliedContacts > 0 ? "text-violet-400" : "text-white/25"}`} />
                <span className="text-xs text-white/50">Unreplied</span>
              </div>
              <p className={`text-xl font-bold ${urgencyQuery.data.unrepliedContacts > 0 ? "text-violet-400" : "text-white/30"}`}>
                {urgencyQuery.data.unrepliedContacts}
              </p>
            </button>
            <button
              onClick={() => setTab("funnel")}
              data-testid="urgency-top-offer"
              className="rounded-2xl px-4 py-3 text-left transition border bg-white/3 border-white/8 hover:bg-white/5 col-span-2 sm:col-span-1"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="h-3.5 w-3.5 text-[#F4A62A]" />
                <span className="text-xs text-white/50">Top Offer This Week</span>
              </div>
              <p className="text-xs font-semibold text-[#F4A62A] leading-tight truncate">
                {urgencyQuery.data.topRecommendedOffer ?? "None yet"}
              </p>
            </button>
          </div>
        )}

        {/* Growth metrics row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Page Views" value={pageViewData.length} icon={Eye} color="#fb923c" />
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
          <div className="space-y-6">
            <DigestButton />
            <Analytics leads={leads} contacts={contacts} subscribers={subscribers} clicks={clicks} pageViewData={pageViewData} />
            <SourcePerformancePanel rows={sourcePerformanceQ.data || []} />
            <div className="flex gap-3">
              <button className="lux-card px-4 py-2 text-sm text-white hover:bg-white/10 transition" onClick={() => generateSourcePerformance.mutate()} disabled={generateSourcePerformance.isPending}>
                {generateSourcePerformance.isPending ? "Generating…" : "Generate Source Performance"}
              </button>
            </div>
          </div>
        )}

        {tab === "voice" && <BrandVoiceGenerator />}

        {tab === "leads" && (
          <div className="space-y-3">
            <ReminderQueuePanel />
            {/* Temperature Filters */}
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "priority", "hot", "warm", "cold"] as const).map((f) => {
                const styles: Record<string, string> = {
                  all: "bg-white/8 text-white",
                  priority: "bg-red-500/15 text-red-400",
                  hot: "bg-orange-500/15 text-orange-400",
                  warm: "bg-yellow-500/15 text-yellow-400",
                  cold: "bg-blue-500/10 text-blue-400",
                };
                const labels: Record<string, string> = { all: "All", priority: "🔥 Priority", hot: "🌡 Hot", warm: "☀ Warm", cold: "❄ Cold" };
                return (
                  <button
                    key={f}
                    onClick={() => setLeadFilter(f)}
                    data-testid={`button-lead-filter-${f}`}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all border ${
                      leadFilter === f
                        ? `${styles[f]} border-current ring-1 ring-current`
                        : "border-white/10 text-white/40 hover:text-white/70"
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
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
              leads.map((lead) => (
                <ChatLeadRow
                  key={lead.id}
                  lead={lead}
                  onConverted={() => qc.invalidateQueries({ queryKey: ["/api/dashboard/leads"] })}
                />
              ))
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
                <ContactCard
                  key={c.id}
                  contact={c}
                  onReplied={(updated) => {
                    contactsQuery.refetch();
                  }}
                />
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

        {tab === "offers" && (
          <div className="space-y-6">
            <OfferOptimizerTab />
            <OfferPerformancePanel rows={offerPerformanceQ.data || []} />
            <div className="flex gap-3">
              <button className="lux-card px-4 py-2 text-sm text-white hover:bg-white/10 transition" onClick={() => generateOfferPerformance.mutate()} disabled={generateOfferPerformance.isPending}>
                {generateOfferPerformance.isPending ? "Generating…" : "Generate Offer Performance"}
              </button>
            </div>
          </div>
        )}
        {tab === "funnel" && (
          <div className="space-y-6">
            <FunnelTab />
            <FunnelLeakPanel rows={funnelLeaksQ.data || []} />
            <div className="flex gap-3">
              <button className="lux-card px-4 py-2 text-sm text-white hover:bg-white/10 transition" onClick={() => generateFunnelLeaks.mutate()} disabled={generateFunnelLeaks.isPending}>
                {generateFunnelLeaks.isPending ? "Generating…" : "Generate Funnel Leak Report"}
              </button>
            </div>
          </div>
        )}
        {tab === "reviews" && <ReviewsTab />}
        {tab === "blog" && <BlogTab />}
        {tab === "knowledge" && <KnowledgeTab />}
        {tab === "digest" && <DigestTab />}
        {tab === "automation" && <AutomationTab />}
        {tab === "pipeline" && <PipelineTab leads={leads} onStageChange={() => qc.invalidateQueries({ queryKey: ["/api/dashboard/leads"] })} />}
        {tab === "revenue" && <RevenueTab />}
        {tab === "system" && <SystemTab />}
        {tab === "audit" && <AuditTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "bookings" && <BookingsTab />}

        {tab === "growth" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Top Source" value={0} icon={TrendingUp} color="#F4A62A" />
              <StatCard label="Biggest Leak" value={0} icon={AlertTriangle} color="#f87171" />
              <StatCard label="Best Offer" value={0} icon={BadgeDollarSign} color="#22c55e" />
              <StatCard label="Experiments" value={growthExperimentsQ.data?.length ?? 0} icon={FlaskConical} color="#a78bfa" />
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="lux-card px-4 py-2 text-sm text-white hover:bg-white/10 transition" onClick={() => generateSourcePerformance.mutate()} disabled={generateSourcePerformance.isPending} data-testid="btn-gen-source">
                {generateSourcePerformance.isPending ? "Generating…" : "Generate Source Performance"}
              </button>
              <button className="lux-card px-4 py-2 text-sm text-white hover:bg-white/10 transition" onClick={() => generateFunnelLeaks.mutate()} disabled={generateFunnelLeaks.isPending} data-testid="btn-gen-funnel">
                {generateFunnelLeaks.isPending ? "Generating…" : "Generate Funnel Leaks"}
              </button>
              <button className="lux-card px-4 py-2 text-sm text-white hover:bg-white/10 transition" onClick={() => generateOfferPerformance.mutate()} disabled={generateOfferPerformance.isPending} data-testid="btn-gen-offers">
                {generateOfferPerformance.isPending ? "Generating…" : "Generate Offer Performance"}
              </button>
              <button className="lux-card px-4 py-2 text-sm text-white hover:bg-white/10 transition" onClick={() => generateGrowthExperiments.mutate()} disabled={generateGrowthExperiments.isPending} data-testid="btn-gen-experiments">
                {generateGrowthExperiments.isPending ? "Generating…" : "Generate Experiments"}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="lux-card p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Top Source</p>
                <p className="text-xl font-semibold text-white">{sourcePerformanceQ.data?.[0]?.sourceName || "—"}</p>
                <p className="text-sm text-slate-400">Score {sourcePerformanceQ.data?.[0]?.qualityScore ?? "—"}</p>
              </div>
              <div className="lux-card p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Biggest Leak</p>
                <p className="text-xl font-semibold text-white">{funnelLeaksQ.data?.[0]?.leakStage || "—"}</p>
                <p className="text-sm text-slate-400">Severity {funnelLeaksQ.data?.[0]?.severityScore ?? "—"}</p>
              </div>
              <div className="lux-card p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Best Offer</p>
                <p className="text-xl font-semibold text-white">{offerPerformanceQ.data?.[0]?.offerSlug || "—"}</p>
                <p className="text-sm text-slate-400">Score {offerPerformanceQ.data?.[0]?.performanceScore ?? "—"}</p>
              </div>
              <div className="lux-card p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Proposed Experiments</p>
                <p className="text-xl font-semibold text-white">{growthExperimentsQ.data?.filter(e => e.status === "proposed").length ?? "—"}</p>
                <p className="text-sm text-slate-400">pending review</p>
              </div>
            </div>

            <SourcePerformancePanel rows={sourcePerformanceQ.data || []} />
            <FunnelLeakPanel rows={funnelLeaksQ.data || []} />
            <OfferPerformancePanel rows={offerPerformanceQ.data || []} />
            <GrowthExperimentsPanel
              rows={growthExperimentsQ.data || []}
              onUpdate={(id, status) => patchGrowthExperiment.mutate({ id, status })}
            />
          </div>
        )}

        {tab === "execution" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Applied Changes" value={appliedChangesQ.data?.length ?? 0} icon={GitMerge} color="#34d399" />
              <StatCard label="Queue Pending" value={(executionQueueQ.data ?? []).filter((i) => i.status === "pending").length} icon={ListTodo} color="#F4A62A" />
              <StatCard label="Rollbacks" value={rollbackEventsQ.data?.length ?? 0} icon={RefreshCw} color="#f87171" />
              <StatCard label="Policies Active" value={(executionPoliciesQ.data ?? []).filter((p) => p.isEnabled).length} icon={Shield} color="#60a5fa" />
            </div>

            <ExecutionPoliciesPanel
              policies={executionPoliciesQ.data ?? []}
              onModeChange={(key, mode) => patchExecutionPolicy.mutate({ key, patch: { mode: mode as ExecutionPolicy["mode"] } })}
              onToggle={(key, enabled) => patchExecutionPolicy.mutate({ key, patch: { isEnabled: enabled } })}
              seeding={seedPolicies.isPending}
              onSeed={() => seedPolicies.mutate()}
            />

            <ExecutionQueuePanel
              items={executionQueueQ.data ?? []}
              onApprove={(id) => patchQueueItem.mutate({ id, patch: { status: "approved" } })}
              onReject={(id) => patchQueueItem.mutate({ id, patch: { status: "cancelled" } })}
              onExecuteNow={(id) => patchQueueItem.mutate({ id, patch: { status: "executing" } })}
              generating={generateExecutionQueue.isPending}
              onGenerate={() => generateExecutionQueue.mutate()}
            />

            <AppliedChangesPanel
              changes={appliedChangesQ.data ?? []}
              onRollback={(id) => rollbackChange.mutate(id)}
              onApplyNow={() => applyNow.mutate()}
              applying={applyNow.isPending}
            />

            <RollbackAlertsPanel
              events={rollbackEventsQ.data ?? []}
              onCheck={() => runRollbackCheck.mutate()}
              checking={runRollbackCheck.isPending}
            />
          </div>
        )}

        {tab === "founder" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Changed Today" value={founderOverviewQuery.data?.changedToday ?? 0} icon={GitMerge} color="#34d399" />
              <StatCard label="Rolled Back" value={founderOverviewQuery.data?.rolledBackToday ?? 0} icon={RefreshCw} color="#f87171" />
              <StatCard label="Needs Approval" value={founderOverviewQuery.data?.pendingApprovals ?? 0} icon={Clock} color="#F4A62A" />
              <StatCard label="Maturity Score" value={founderOverviewQuery.data?.maturityScore ?? 0} icon={Crown} color="#818cf8" />
            </div>

            <FounderCommandPanel
              overview={founderOverviewQuery.data ?? null}
              maturity={maturityQuery.data ?? null}
              onRefresh={async () => {
                setP52RefreshingOverview(true);
                await Promise.all([
                  qc.invalidateQueries({ queryKey: ["founder-overview"] }),
                  qc.invalidateQueries({ queryKey: ["founder-maturity"] }),
                ]);
                setP52RefreshingOverview(false);
              }}
              refreshing={p52RefreshingOverview}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <ApprovalsQueuePanel
                requests={approvalRequestsQuery.data ?? []}
                onApprove={(id) => approveRequest.mutate(id)}
                onReject={(id) => rejectRequest.mutate(id)}
              />
              <SystemHealthPanel
                latest={healthSummaryQuery.data?.latest ?? null}
                history={healthSummaryQuery.data?.history ?? []}
                onHealthCheck={async () => {
                  setP52Checking(true);
                  await authedJson("/api/system/run-health-check", { method: "POST" });
                  await qc.invalidateQueries({ queryKey: ["system-health-summary"] });
                  setP52Checking(false);
                }}
                onSafeMode={async (enabled) => {
                  await authedJson("/api/system/safe-mode", { method: "POST", body: JSON.stringify({ enabled }) });
                  qc.invalidateQueries({ queryKey: ["execution-policies"] });
                }}
                onKillSwitch={async () => {
                  if (!confirm("Activate kill switch? All auto-apply policies will be disabled.")) return;
                  await authedJson("/api/system/kill-switch", { method: "POST" });
                  qc.invalidateQueries({ queryKey: ["execution-policies"] });
                }}
                checking={p52Checking}
              />
            </div>

            <MaturityScorePanel
              maturity={maturityQuery.data ?? null}
              quarterly={quarterlyQuery.data ?? null}
              onGenerateStrategy={async () => {
                setP52Generating(true);
                await authedJson("/api/strategy/quarterly/generate", { method: "POST" });
                await qc.invalidateQueries({ queryKey: ["quarterly-strategy-latest"] });
                setP52Generating(false);
              }}
              generating={p52Generating}
            />

            <ExplainabilityPanel
              explanations={explanationsQuery.data ?? []}
              title="Recent AI Decisions & Explanations"
            />
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
