// Phase 72.4R — Google Search Console tabs: window totals, query
// intelligence buckets, and landing-page intelligence joined to first-party
// outcomes. All reads are cached SQL snapshots — never live Google calls.

import { MousePointerClick, Eye, Percent, MoveUp, SearchCheck, Link2 } from "lucide-react";
import type { SearchIntelDashboardPayload, QueryIntelItem, SearchConsoleStatus } from "@shared/types/searchIntel";
import { Stat, SectionCard, EmptyCard, DeltaText, fmtPct, fmtUsd, fmtPos } from "./shared";

export function GscNotReadyCard({ sc, context }: { sc: SearchConsoleStatus; context: string }) {
  if (!sc.configured) {
    return (
      <EmptyCard
        testId="card-gsc-not-configured"
        title="Google Search Console not connected"
        message={`${context} ${sc.reason ?? ""}`}
      />
    );
  }
  return (
    <EmptyCard
      testId="card-gsc-no-data"
      title="No Search Console data yet"
      message={`${context} Credentials are configured (${sc.siteUrl}) but no snapshots are stored — run a sync from the Sync Status tab.`}
    />
  );
}

export function GscTotalsStrip({ payload }: { payload: SearchIntelDashboardPayload }) {
  const totals = payload.gscTotals;
  if (!totals) return null;
  const { current, previous, windowDays } = totals;
  return (
    <div>
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
        Google Search Console · last {windowDays} days vs prior {windowDays}
        {payload.searchConsole.dataThrough && <span className="ml-2 normal-case">(data through {payload.searchConsole.dataThrough})</span>}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={MousePointerClick} label="Clicks" value={current.clicks.toLocaleString()} testId="stat-gsc-clicks"
          sub={<DeltaText value={current.clicks - previous.clicks} />} />
        <Stat icon={Eye} label="Impressions" value={current.impressions.toLocaleString()} testId="stat-gsc-impressions"
          sub={<DeltaText value={current.impressions - previous.impressions} />} />
        <Stat icon={Percent} label="CTR" value={fmtPct(current.ctrPct)} testId="stat-gsc-ctr"
          sub={<span>prev {fmtPct(previous.ctrPct)}</span>} />
        <Stat icon={MoveUp} label="Avg position" value={fmtPos(current.avgPosition)} testId="stat-gsc-position"
          sub={<span>prev {fmtPos(previous.avgPosition)}</span>} />
      </div>
    </div>
  );
}

function QueryTable({ items, bucket }: { items: QueryIntelItem[]; bucket: string }) {
  if (items.length === 0) return <p className="text-white/35 text-sm mt-2">Nothing in this bucket for the current window.</p>;
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Query</th>
            <th className="text-right py-2 px-2">Clicks</th>
            <th className="text-right py-2 px-2">Impr.</th>
            <th className="text-right py-2 px-2">CTR</th>
            <th className="text-right py-2 px-2">Pos.</th>
            <th className="text-right py-2 px-2">Δ Impr.</th>
            <th className="text-left py-2 pl-4">Top pages</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q, i) => (
            <tr key={q.query} className="border-t border-white/5 text-white/80" data-testid={`row-query-${bucket}-${i}`}>
              <td className="py-2 pr-4 text-white/85 break-all max-w-[260px]">{q.query}</td>
              <td className="text-right py-2 px-2 font-bold text-white">{q.clicks.toLocaleString()}</td>
              <td className="text-right py-2 px-2">{q.impressions.toLocaleString()}</td>
              <td className="text-right py-2 px-2">{fmtPct(q.ctrPct)}</td>
              <td className="text-right py-2 px-2">{fmtPos(q.avgPosition)}</td>
              <td className="text-right py-2 px-2"><DeltaText value={q.deltaImpressions} /></td>
              <td className="py-2 pl-4 text-white/50 text-xs break-all">{q.topPages.join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QueriesTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const q = payload.queries;
  if (!q) {
    return <GscNotReadyCard sc={payload.searchConsole} context="Query intelligence (top, emerging, declining, low-CTR, near-page-one buckets) activates once Search Console snapshots are imported." />;
  }
  return (
    <div className="space-y-6">
      <GscTotalsStrip payload={payload} />
      <SectionCard title="Top queries" icon={SearchCheck} subtitle={`Best performers by clicks over the last ${q.windowDays} days.`}>
        <QueryTable items={q.topQueries.slice(0, 20)} bucket="top" />
      </SectionCard>
      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Emerging queries" subtitle="Impressions growing ≥1.5× vs the prior window.">
          <QueryTable items={q.emerging} bucket="emerging" />
        </SectionCard>
        <SectionCard title="Declining queries" subtitle="Impressions down to ≤0.5× of the prior window.">
          <QueryTable items={q.declining} bucket="declining" />
        </SectionCard>
        <SectionCard title="High impressions · low CTR" subtitle="≥50 impressions, CTR under 1.5% — title/description rewrite candidates.">
          <QueryTable items={q.lowCtrHighImpressions} bucket="lowctr" />
        </SectionCard>
        <SectionCard title="Near page one" subtitle="Average position 8–14 — striking-distance opportunities.">
          <QueryTable items={q.nearPageOne} bucket="nearp1" />
        </SectionCard>
      </div>
      <p className="text-white/30 text-xs leading-relaxed">Bucket thresholds: {q.thresholds}.</p>
    </div>
  );
}

export function LandingPagesTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const lp = payload.landingPages;
  if (!lp) {
    return <GscNotReadyCard sc={payload.searchConsole} context="Landing-page intelligence (GSC performance joined to first-party visitors, bookings and revenue) activates once Search Console snapshots are imported." />;
  }
  return (
    <div className="space-y-6">
      <GscTotalsStrip payload={payload} />
      <SectionCard title="Landing pages" icon={Link2} subtitle={`Search performance joined to first-party outcomes · last ${lp.windowDays} days.`}>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Path</th>
                <th className="text-right py-2 px-2">Clicks</th>
                <th className="text-right py-2 px-2">Impr.</th>
                <th className="text-right py-2 px-2">CTR</th>
                <th className="text-right py-2 px-2">Pos.</th>
                <th className="text-right py-2 px-2">Δ Impr.</th>
                <th className="text-right py-2 px-2">Organic visitors</th>
                <th className="text-right py-2 px-2">Funnel</th>
                <th className="text-right py-2 px-2">Bookings</th>
                <th className="text-right py-2 px-2">Revenue</th>
                <th className="text-right py-2 pl-2">AI-assisted</th>
              </tr>
            </thead>
            <tbody>
              {lp.items.map((p, i) => (
                <tr key={p.path} className="border-t border-white/5 text-white/80" data-testid={`row-landing-${i}`}>
                  <td className="py-2 pr-4 text-white/85 break-all max-w-[240px]">{p.path}</td>
                  <td className="text-right py-2 px-2 font-bold text-white">{p.clicks.toLocaleString()}</td>
                  <td className="text-right py-2 px-2">{p.impressions.toLocaleString()}</td>
                  <td className="text-right py-2 px-2">{fmtPct(p.ctrPct)}</td>
                  <td className="text-right py-2 px-2">{fmtPos(p.avgPosition)}</td>
                  <td className="text-right py-2 px-2"><DeltaText value={p.deltaImpressions} /></td>
                  <td className="text-right py-2 px-2">{p.organicVisitors.toLocaleString()}</td>
                  <td className="text-right py-2 px-2">{p.organicFunnelSessions.toLocaleString()}</td>
                  <td className="text-right py-2 px-2">{p.organicBookings.toLocaleString()}</td>
                  <td className="text-right py-2 px-2 text-emerald-400 font-semibold">{fmtUsd(p.organicRevenueCents)}</td>
                  <td className="text-right py-2 pl-2">{p.aiAssistedConversions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <p className="text-white/30 text-xs leading-relaxed" data-testid="text-landing-attribution-note">{lp.attributionNote}</p>
    </div>
  );
}
