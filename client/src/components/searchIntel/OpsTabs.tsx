// Phase 72.4R — operational tabs: Core Web Vitals (field RUM), organic
// revenue attribution, prioritized recommendations, and sync status/controls.

import { Gauge, DollarSign, Users, CalendarCheck, Bot, Lightbulb, RefreshCw, Loader2, Cloud, ClipboardList } from "lucide-react";
import type { SearchIntelDashboardPayload } from "@shared/types/searchIntel";
import { Stat, SectionCard, EmptyCard, SeverityPill, RatingPill, StatusPill, OkBadge, fmtUsd, fmtVital } from "./shared";

const SOURCE_LABELS: Record<string, string> = {
  rum_field: "Field (RUM)",
  crux_field: "Field (CrUX)",
  lighthouse_lab: "Lab (synthetic)",
};

export function WebVitalsTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const wv = payload.webVitals;
  const hasData = wv.metrics.length > 0;
  return (
    <div className="space-y-6">
      {!hasData ? (
        <EmptyCard
          testId="card-vitals-empty"
          title="No field data collected yet"
          message="Real-user measurements (LCP, INP, CLS) stream in automatically as visitors browse the live site — the collector is active on every page. Check back after real traffic arrives."
        />
      ) : (
        <SectionCard title="Core Web Vitals · p75" icon={Gauge}
          subtitle={`Last ${wv.windowDays} days · p75 per metric × device, field data ${wv.fieldDataAvailable ? "available" : "not yet available"}.`}>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Metric</th>
                  <th className="text-left py-2 px-2">Device</th>
                  <th className="text-right py-2 px-2">p75</th>
                  <th className="text-center py-2 px-2">Rating</th>
                  <th className="text-right py-2 px-2">Samples</th>
                  <th className="text-left py-2 pl-4">Source</th>
                </tr>
              </thead>
              <tbody>
                {wv.metrics.map((m, i) => (
                  <tr key={`${m.metric}-${m.deviceClass}-${m.source}`} className="border-t border-white/5 text-white/80" data-testid={`row-vital-${i}`}>
                    <td className="py-2 pr-4 font-bold text-white uppercase">{m.metric}</td>
                    <td className="py-2 px-2 text-white/60 capitalize">{m.deviceClass}</td>
                    <td className="text-right py-2 px-2 font-bold text-white">{fmtVital(m.metric, m.p75)}</td>
                    <td className="text-center py-2 px-2"><RatingPill rating={m.rating} /></td>
                    <td className="text-right py-2 px-2">{m.samples.toLocaleString()}</td>
                    <td className="py-2 pl-4 text-white/50 text-xs">{SOURCE_LABELS[m.source] ?? m.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      <div className="lux-card space-y-2">
        <p className="text-white/40 text-xs leading-relaxed"><span className="text-white/60 font-semibold">Thresholds:</span> {wv.thresholds}</p>
        <p className="text-white/40 text-xs leading-relaxed" data-testid="text-vitals-note"><span className="text-white/60 font-semibold">Data honesty:</span> {wv.note}</p>
      </div>
    </div>
  );
}

export function OrganicRevenueTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const or = payload.organicRevenue;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat icon={Users} label="Organic sessions" value={or.organicSessions.toLocaleString()} testId="stat-organic-sessions" />
        <Stat icon={Users} label="Entered funnel" value={or.organicFunnelSessions.toLocaleString()} testId="stat-organic-funnel" />
        <Stat icon={CalendarCheck} label="Bookings" value={or.organicBookings.toLocaleString()} testId="stat-organic-bookings" />
        <Stat icon={DollarSign} label="Organic revenue" value={fmtUsd(or.organicRevenueCents)} testId="stat-organic-revenue" />
        <Stat icon={Bot} label="AI-assisted conversions" value={or.aiAssistedConversions.toLocaleString()} testId="stat-organic-ai-conversions" />
        <Stat icon={Bot} label="AI-assisted revenue" value={fmtUsd(or.aiAssistedRevenueCents)} testId="stat-organic-ai-revenue" />
      </div>
      <SectionCard title="Revenue by organic landing page" icon={DollarSign}
        subtitle="First-party sessions that landed from a search engine, joined to funnel and revenue events.">
        {or.byLandingPage.length === 0 ? (
          <p className="text-white/35 text-sm mt-2">No organic landings recorded yet — rows appear as soon as search visitors arrive.</p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Landing path</th>
                  <th className="text-right py-2 px-2">Sessions</th>
                  <th className="text-right py-2 px-2">Funnel</th>
                  <th className="text-right py-2 px-2">Bookings</th>
                  <th className="text-right py-2 px-2">Revenue</th>
                  <th className="text-right py-2 pl-2">AI-assisted</th>
                </tr>
              </thead>
              <tbody>
                {or.byLandingPage.map((p, i) => (
                  <tr key={p.path} className="border-t border-white/5 text-white/80" data-testid={`row-organic-page-${i}`}>
                    <td className="py-2 pr-4 break-all max-w-[260px]">{p.path}</td>
                    <td className="text-right py-2 px-2 font-bold text-white">{p.organicSessions.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">{p.funnelSessions.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">{p.bookings.toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-emerald-400 font-semibold">{fmtUsd(p.revenueCents)}</td>
                    <td className="text-right py-2 pl-2">{p.aiAssistedConversions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      <p className="text-white/30 text-xs leading-relaxed" data-testid="text-organic-attribution-note">{or.attributionNote}</p>
    </div>
  );
}

export function RecommendationsTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const recs = payload.recommendations;
  if (recs.length === 0) {
    return (
      <EmptyCard
        testId="card-recs-empty"
        title="No recommendations right now"
        message="Everything monitored — metadata, structured data, indexability, Core Web Vitals, query performance and content engagement — currently looks healthy. New recommendations appear automatically when audits or Search Console data surface issues."
      />
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{recs.length} prioritized recommendation{recs.length === 1 ? "" : "s"} — derived only from stored audit findings and snapshots, never guesses.</p>
      {recs.map((r) => (
        <div key={r.id} className="lux-card" data-testid={`card-rec-${r.id}`}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityPill severity={r.severity} />
            <span className="text-white/35 text-[10px] uppercase tracking-wide">{r.category}</span>
          </div>
          <p className="text-white font-bold text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-[#F4A62A] shrink-0" /> {r.title}</p>
          <p className="text-white/55 text-sm mt-1 leading-relaxed">{r.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function SyncStatusTab({ payload, onSync, syncing, syncMessage, syncError }: {
  payload: SearchIntelDashboardPayload;
  onSync: () => void;
  syncing: boolean;
  syncMessage: string | null;
  syncError: string | null;
}) {
  const sc = payload.syncStatus.searchConsole;
  return (
    <div className="space-y-6">
      <SectionCard title="Google Search Console" icon={Cloud}>
        <div className="space-y-2 text-sm mt-2">
          <div className="flex items-center justify-between">
            <span className="text-white/75">Connection</span>
            {sc.configured
              ? <span className="text-emerald-400 font-bold text-xs" data-testid="text-gsc-configured">Configured · {sc.siteUrl}</span>
              : <span className="text-amber-400 font-bold text-xs" data-testid="text-gsc-not-configured">Not configured</span>}
          </div>
          {!sc.configured && sc.reason && (
            <p className="text-white/45 text-xs leading-relaxed bg-white/4 border border-white/10 rounded-xl p-3" data-testid="text-gsc-reason">{sc.reason}</p>
          )}
          {!sc.configured && (
            <div className="text-white/45 text-xs leading-relaxed bg-white/4 border border-white/10 rounded-xl p-3 space-y-1.5" data-testid="panel-gsc-setup">
              <p className="text-white/70 font-bold uppercase tracking-wide text-[10px]">Activation checklist (Render)</p>
              <p>1. Set <span className="font-mono text-white/70">GOOGLE_SEARCH_CONSOLE_CREDENTIALS</span> to the complete service-account JSON key as one string (escaped newlines in the private key are handled automatically).</p>
              <p>2. Set <span className="font-mono text-white/70">GSC_SITE_URL</span> to <span className="font-mono text-white/70">sc-domain:elevate360official.com</span> (exact value).</p>
              <p>3. In Google Search Console, add the service-account email as a user on the verified domain property.</p>
              <p className="text-white/30">The credential value itself is never displayed, logged or stored.</p>
            </div>
          )}
          <div className="flex items-center justify-between"><span className="text-white/75">Last successful sync</span><span className="text-white font-bold" data-testid="text-gsc-last-sync">{sc.lastSuccessfulSyncAt ? new Date(sc.lastSuccessfulSyncAt).toLocaleString() : "never"}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/75">Data through</span><span className="text-white font-bold">{sc.dataThrough ?? "—"}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/75">Stored query rows</span><span className="text-white font-bold" data-testid="text-gsc-query-rows">{sc.totalQueryRows.toLocaleString()}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/75">Stored page rows</span><span className="text-white font-bold">{sc.totalPageRows.toLocaleString()}</span></div>
        </div>
      </SectionCard>

      <div className="lux-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">Run sync & audit</h2>
            <p className="text-white/40 text-xs mt-1 max-w-xl leading-relaxed">
              Imports Search Console snapshots (when configured) and runs the full SEO audit — metadata, structured data,
              indexability, sitemap and internal links — against the live server. Dashboards always read stored snapshots; this is the only action that fetches anything.
            </p>
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            data-testid="button-run-sync"
            className="btn-primary px-5 py-2.5 flex items-center gap-2 disabled:opacity-60"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? "Running…" : "Run sync now"}
          </button>
        </div>
        {syncMessage && <p className="text-emerald-400 text-sm mt-3" data-testid="text-sync-result">{syncMessage}</p>}
        {syncError && <p className="text-red-400 text-sm mt-3" data-testid="text-sync-error">{syncError}</p>}
      </div>

      <SectionCard title="Recent Search Console syncs" icon={Cloud}>
        {payload.syncStatus.recentSyncRuns.length === 0 ? (
          <p className="text-white/35 text-sm mt-2">No sync runs yet.</p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Started</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Source</th>
                  <th className="text-left py-2 px-2">Window</th>
                  <th className="text-right py-2 px-2">Query rows</th>
                  <th className="text-right py-2 px-2">Page rows</th>
                  <th className="text-left py-2 pl-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {payload.syncStatus.recentSyncRuns.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 text-white/80" data-testid={`row-sync-run-${r.id}`}>
                    <td className="py-2 pr-4 text-white/60 whitespace-nowrap">{new Date(r.startedAt).toLocaleString()}</td>
                    <td className="py-2 px-2"><StatusPill status={r.status} /></td>
                    <td className="py-2 px-2 text-white/60">{r.source}</td>
                    <td className="py-2 px-2 text-white/60 whitespace-nowrap">{r.startDate && r.endDate ? `${r.startDate} → ${r.endDate}` : r.daysRequested ? `${r.daysRequested}d` : "—"}</td>
                    <td className="text-right py-2 px-2">{r.queryRows.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">{r.pageRows.toLocaleString()}</td>
                    <td className="py-2 pl-4 text-red-400/80 text-xs break-all max-w-[220px]">{r.errorText ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent SEO audits" icon={ClipboardList}>
        {payload.syncStatus.recentAuditRuns.length === 0 ? (
          <p className="text-white/35 text-sm mt-2">No audits yet — run one above.</p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Started</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Pages</th>
                  <th className="text-right py-2 px-2">Issues found</th>
                  <th className="text-left py-2 pl-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {payload.syncStatus.recentAuditRuns.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 text-white/80" data-testid={`row-audit-run-${r.id}`}>
                    <td className="py-2 pr-4 text-white/60 whitespace-nowrap">{new Date(r.startedAt).toLocaleString()}</td>
                    <td className="py-2 px-2"><StatusPill status={r.status} /></td>
                    <td className="text-right py-2 px-2">{r.pagesAudited.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">{r.issuesFound.toLocaleString()}</td>
                    <td className="py-2 pl-4 text-red-400/80 text-xs break-all max-w-[260px]">{r.errorText ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="lux-card space-y-2">
        <div className="flex items-center justify-between text-sm"><span className="text-white/75">Dashboard reads call Google</span><OkBadge ok={true} yes="Never — stored snapshots only" no="" /></div>
        <p className="text-white/40 text-xs leading-relaxed">
          Sync is founder-triggered only (rate-limited, one Search Console sync at a time). Search Console data lags ~2–3 days behind real time; that is a Google property, not a bug.
        </p>
      </div>
    </div>
  );
}
