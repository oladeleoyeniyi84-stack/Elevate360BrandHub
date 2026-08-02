// Phase 72.4R — Founder-only Search Intelligence & Authority Platform.
// Tabbed console: the original first-party attribution view (Overview,
// preserved verbatim) plus Search Console intelligence, SEO audits, Core Web
// Vitals, organic revenue attribution, recommendations and sync controls.
// One composed GET feeds every tab — dashboard reads never call Google.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Phase 72.4.2 — carry the HTTP status on load failures so the console can
// route 401 back into the PIN flow instead of a generic error screen.
class HttpError extends Error {
  constructor(public status: number) {
    super(`Failed to load search intelligence (${status})`);
    this.name = "HttpError";
  }
}
import { Search, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import type { SearchIntelDashboardPayload } from "@shared/types/searchIntel";
import { GOLD, BG } from "@/components/searchIntel/shared";
import { FirstPartyOverview } from "@/components/searchIntel/FirstPartyOverview";
import { GscTotalsStrip, QueriesTab, LandingPagesTab } from "@/components/searchIntel/GscTabs";
import { SeoHealthTab, StructuredDataTab, MetadataTab, SocialTab, IndexCoverageTab } from "@/components/searchIntel/SeoTabs";
import { WebVitalsTab, OrganicRevenueTab, RecommendationsTab, SyncStatusTab } from "@/components/searchIntel/OpsTabs";
import { GrowthActionsTab } from "@/components/searchIntel/GrowthActionsTab";

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
            <Search className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Search Intelligence</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-search-pin"
              type={showPin ? "text" : "password"} value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN" autoComplete="current-password" autoFocus required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-search-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-search-login" className="btn-primary w-full py-3">Access Search Intelligence</button>
        </form>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "queries", label: "Queries" },
  { id: "pages", label: "Landing Pages" },
  { id: "seo-health", label: "SEO Health" },
  { id: "structured", label: "Structured Data" },
  { id: "metadata", label: "Metadata" },
  { id: "social", label: "Social" },
  { id: "indexing", label: "Index Coverage" },
  { id: "vitals", label: "Web Vitals" },
  { id: "organic-revenue", label: "Organic Revenue" },
  { id: "recommendations", label: "Recommendations" },
  { id: "growth-actions", label: "Growth Actions" },
  { id: "sync", label: "Sync Status" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Console({ onUnauthenticated }: { onUnauthenticated: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery<SearchIntelDashboardPayload>({
    queryKey: ["/api/dashboard/search-intelligence"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/search-intelligence");
      if (!res.ok) throw new HttpError(res.status);
      return res.json();
    },
    // Auth failures are deterministic — retrying them only delays the PIN
    // prompt. Transient (network/5xx) failures still get one retry.
    retry: (count, err) =>
      !(err instanceof HttpError && (err.status === 401 || err.status === 403)) && count < 2,
  });

  // Session expired (or was never established server-side): hand control back
  // to the PIN gate rather than showing a load-failure screen.
  const unauthorized = query.error instanceof HttpError && query.error.status === 401;
  useEffect(() => {
    if (unauthorized) onUnauthenticated();
  }, [unauthorized, onUnauthenticated]);

  const runSync = async () => {
    setSyncing(true); setSyncMessage(null); setSyncError(null);
    try {
      const res = await fetch("/api/dashboard/search-intelligence/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncError(body?.error ?? `Sync failed (${res.status})`);
        return;
      }
      const parts: string[] = [];
      if (body?.gsc) {
        parts.push(body.gsc.status === "not_configured"
          ? "Search Console: not configured (skipped)"
          : `Search Console: ${body.gsc.status} · ${body.gsc.rows?.queries ?? 0} query rows`);
      }
      if (body?.audits) {
        parts.push(`Audit: ${body.audits.status} · ${body.audits.pagesAudited ?? 0} pages · ${body.audits.issuesFound ?? 0} issues`);
      }
      setSyncMessage(parts.length > 0 ? parts.join(" — ") : "Sync completed.");
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/search-intelligence"] });
    } catch {
      setSyncError("Sync failed — network error.");
    } finally {
      setSyncing(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }
  if (unauthorized) {
    // The PIN gate is about to take over — render the spinner, never the
    // generic failure screen, for an authentication condition.
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    const forbidden = query.error instanceof HttpError && query.error.status === 403;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
        <p className="text-white/60" data-testid="text-si-load-error">
          {forbidden
            ? "Access denied — this account is not permitted to view Search Intelligence."
            : "Could not load search intelligence."}
        </p>
        {!forbidden && (
          <button onClick={() => query.refetch()} className="btn-primary px-6 py-2">Retry</button>
        )}
      </div>
    );
  }

  const payload = query.data;
  const recCount = payload.recommendations.length;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
              <Search className="h-7 w-7" style={{ color: GOLD }} /> Search Intelligence
            </h1>
            <p className="text-white/45 text-sm mt-1">
              First-party attribution · Search Console intelligence · SEO audits · Core Web Vitals · organic revenue.
            </p>
          </div>
          <button
            onClick={() => query.refetch()}
            data-testid="button-search-refresh"
            className="flex items-center gap-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2 text-sm transition"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              data-testid={`tab-si-${t.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === t.id ? "text-black" : "text-white/60 bg-white/5 hover:bg-white/10"
              }`}
              style={activeTab === t.id ? { background: GOLD } : undefined}
            >
              {t.label}
              {t.id === "recommendations" && recCount > 0 && (
                <span className={`ml-1.5 inline-block px-1.5 rounded-md text-[10px] font-black ${activeTab === t.id ? "bg-black/20 text-black" : "bg-[#F4A62A]/20 text-[#F4A62A]"}`}>
                  {recCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            {payload.gscTotals ? (
              <GscTotalsStrip payload={payload} />
            ) : !payload.searchConsole.configured ? (
              <p className="text-white/35 text-xs" data-testid="banner-gsc-not-configured">
                Google Search Console is not connected — clicks, impressions and rankings activate via the Sync Status tab.
              </p>
            ) : null}
            <FirstPartyOverview data={payload.firstParty} />
          </div>
        )}
        {activeTab === "queries" && <QueriesTab payload={payload} />}
        {activeTab === "pages" && <LandingPagesTab payload={payload} />}
        {activeTab === "seo-health" && <SeoHealthTab payload={payload} />}
        {activeTab === "structured" && <StructuredDataTab payload={payload} />}
        {activeTab === "metadata" && <MetadataTab payload={payload} />}
        {activeTab === "social" && <SocialTab payload={payload} />}
        {activeTab === "indexing" && <IndexCoverageTab payload={payload} />}
        {activeTab === "vitals" && <WebVitalsTab payload={payload} />}
        {activeTab === "organic-revenue" && <OrganicRevenueTab payload={payload} />}
        {activeTab === "recommendations" && <RecommendationsTab payload={payload} />}
        {activeTab === "growth-actions" && <GrowthActionsTab />}
        {activeTab === "sync" && (
          <SyncStatusTab payload={payload} onSync={runSync} syncing={syncing} syncMessage={syncMessage} syncError={syncError} />
        )}

        <p className="text-white/25 text-xs">Generated {new Date(payload.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function SearchIntelligence() {
  const queryClient = useQueryClient();
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("e360_dashboard_auth") === "true"; } catch { return false; }
  });

  // Phase 72.4.2: a 401 from the dashboard API means the server session is
  // gone even if the sessionStorage hint says otherwise — clear the stale
  // hint and re-run the PIN flow.
  const handleUnauthenticated = () => {
    try { sessionStorage.removeItem("e360_dashboard_auth"); } catch { /* no-op */ }
    setAuthed(false);
  };

  // After a successful PIN login, drop the cached 401 result so the console
  // automatically reloads with the fresh server session.
  const handleAuth = () => {
    queryClient.removeQueries({ queryKey: ["/api/dashboard/search-intelligence"] });
    setAuthed(true);
  };

  if (!authed) return <PinGate onAuth={handleAuth} />;
  return <Console onUnauthenticated={handleUnauthenticated} />;
}
