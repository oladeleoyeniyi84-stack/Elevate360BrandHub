// Phase 72.4R — the original first-party Search Intelligence console body,
// preserved verbatim as the Overview tab (KPIs, traffic sources, content
// authority, outcomes, footprint, integrity, trends). All 72.4 test ids and
// analytics semantics are unchanged; only the fetch moved to the composed
// payload (this component receives `data` = payload.firstParty).

import { useState } from "react";
import {
  Search, Bot, Users, Globe, Eye, BookOpen, CheckCircle2, DollarSign,
  Link2, Megaphone, Award, Filter, FileText,
} from "lucide-react";
import type { SearchIntelSummary, SearchTrendBucket, ContentAuthorityItem, TrafficSourceBreakdownItem } from "@shared/types/searchIntel";
import { GOLD, SOURCE_LABELS, fmtPct, fmtUsd, Stat, TopList } from "./shared";

function SourceRow({ item, maxSessions }: { item: TrafficSourceBreakdownItem; maxSessions: number }) {
  const width = maxSessions > 0 ? Math.max((item.sessions / maxSessions) * 100, item.sessions > 0 ? 3 : 0) : 0;
  return (
    <div data-testid={`row-source-${item.source}`}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-white/75">{SOURCE_LABELS[item.source] ?? item.source}</span>
        <span className="text-white/50 text-xs">
          {item.funnelSessions > 0 && <span className="mr-3">funnel {item.funnelSessions}</span>}
          {item.revenueSessions > 0 && <span className="mr-3">revenue {item.revenueSessions}</span>}
          {item.attributedRevenueCents > 0 && <span className="mr-3 text-emerald-400">{fmtUsd(item.attributedRevenueCents)}</span>}
          <span className="text-white font-bold text-sm">{item.sessions.toLocaleString()}</span>
          <span className="ml-2">{fmtPct(item.sharePct)}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: GOLD }} />
      </div>
    </div>
  );
}

function AuthorityTable({ items }: { items: ContentAuthorityItem[] }) {
  if (items.length === 0) {
    return <p className="text-white/35 text-sm mt-3">No content engagement tracked yet — authority scores appear once posts and articles get views.</p>;
  }
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Content</th>
            <th className="text-right py-2 px-2">Views</th>
            <th className="text-right py-2 px-2">Depth</th>
            <th className="text-right py-2 px-2">Compl.</th>
            <th className="text-right py-2 px-2">Shares</th>
            <th className="text-right py-2 pl-2">Authority</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.slug} className="border-t border-white/5 text-white/80" data-testid={`row-authority-${c.slug}`}>
              <td className="py-2 pr-4">
                <span className="text-white/85 break-all">{c.slug}</span>
                {c.contentType && <span className="ml-2 text-[10px] uppercase tracking-wide text-white/35">{c.contentType}</span>}
              </td>
              <td className="text-right py-2 px-2">{c.views.toLocaleString()}</td>
              <td className="text-right py-2 px-2">{fmtPct(c.avgReadPercent)}</td>
              <td className="text-right py-2 px-2">{fmtPct(c.completionRatePct)}</td>
              <td className="text-right py-2 px-2">{c.shares.toLocaleString()}</td>
              <td className="text-right py-2 pl-2">
                <div className="inline-flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.authorityIndex}%`, background: GOLD }} />
                  </div>
                  <span className="font-bold text-white w-7 text-right">{c.authorityIndex}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PeriodTab = "daily" | "weekly" | "monthly";

function TrendTable({ buckets }: { buckets: SearchTrendBucket[] }) {
  if (buckets.length === 0) return <p className="text-white/35 text-sm mt-3">No search activity in this period yet.</p>;
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Period</th>
            <th className="text-right py-2 px-2">Landings</th>
            <th className="text-right py-2 px-2">Organic</th>
            <th className="text-right py-2 px-2">AI</th>
            <th className="text-right py-2 pl-2">Content views</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.bucket} className="border-t border-white/5 text-white/80" data-testid={`row-search-period-${b.bucket}`}>
              <td className="py-2 pr-4 text-white/60">{b.bucket}</td>
              <td className="text-right py-2 px-2 font-bold text-white">{b.landings}</td>
              <td className="text-right py-2 px-2">{b.organic}</td>
              <td className="text-right py-2 px-2">{b.aiAssistant}</td>
              <td className="text-right py-2 pl-2">{b.contentViews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FirstPartyOverview({ data }: { data: SearchIntelSummary }) {
  const [periodTab, setPeriodTab] = useState<PeriodTab>("daily");
  const { kpis, diagnostics, footprint } = data;
  const maxSessions = Math.max(...data.sources.map((s) => s.sessions), 0);
  const periodBuckets = periodTab === "daily" ? data.daily : periodTab === "weekly" ? data.weekly : data.monthly;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Attributed sessions" value={kpis.attributedSessions.toLocaleString()} testId="stat-search-sessions" />
        <Stat icon={Search} label="Organic share" value={fmtPct(kpis.organicSharePct)} testId="stat-search-organic-share" />
        <Stat icon={Bot} label="AI assistant sessions" value={kpis.aiAssistantSessions.toLocaleString()} testId="stat-search-ai-sessions" />
        <Stat icon={Globe} label="Landings · 30d" value={kpis.landingsLast30d.toLocaleString()} testId="stat-search-landings-30d" />
        <Stat icon={Eye} label="Content views" value={kpis.contentViews.toLocaleString()} testId="stat-search-content-views" />
        <Stat icon={BookOpen} label="Avg read depth" value={fmtPct(kpis.avgReadPercent)} testId="stat-search-read-depth" />
        <Stat icon={CheckCircle2} label="Completion rate" value={fmtPct(kpis.contentCompletionRatePct)} testId="stat-search-completion" />
        <Stat icon={DollarSign} label="Attributed revenue" value={fmtUsd(kpis.attributedRevenueCents)} testId="stat-search-revenue" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="lux-card">
            <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-4">Traffic sources</h2>
            {kpis.attributedSessions === 0 ? (
              <p className="text-white/35 text-sm">No search landings captured yet — sessions appear as soon as visitors arrive.</p>
            ) : (
              <div className="space-y-3">
                {data.sources.map((s) => <SourceRow key={s.source} item={s} maxSessions={maxSessions} />)}
              </div>
            )}
          </div>

          <div className="lux-card">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-[#F4A62A]" />
              <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">Content authority</h2>
            </div>
            <p className="text-white/35 text-xs">
              First-party engagement authority (reach · depth · completion · amplification) — not third-party domain authority.
            </p>
            <AuthorityTable items={data.contentAuthority} />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide mb-3">Outcomes & attribution</h2>
          <div className="lux-card">
            <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><Filter className="h-4 w-4 text-[#F4A62A]" /> Search → Outcomes</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between" data-testid="row-search-to-funnel">
                <span className="text-white/75">Entered funnel</span>
                <span className="text-white font-bold">{kpis.searchToFunnelSessions.toLocaleString()} <span className="text-white/40 font-normal">({fmtPct(kpis.searchToFunnelRatePct)})</span></span>
              </div>
              <div className="flex items-center justify-between" data-testid="row-search-to-revenue">
                <span className="text-white/75">Revenue-engaged</span>
                <span className="text-white font-bold">{kpis.searchToRevenueSessions.toLocaleString()} <span className="text-white/40 font-normal">({fmtPct(kpis.searchToRevenueRatePct)})</span></span>
              </div>
              <div className="flex items-center justify-between" data-testid="row-search-attributed-revenue">
                <span className="text-white/75">Attributed revenue</span>
                <span className="text-emerald-400 font-bold">{fmtUsd(kpis.attributedRevenueCents)}</span>
              </div>
              <div className="flex items-center justify-between" data-testid="row-search-shares">
                <span className="text-white/75">Content shares</span>
                <span className="text-white font-bold">{kpis.contentShares.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <TopList title="Referrer hosts" icon={Globe} items={data.topReferrerHosts} emptyText="No external referrers yet." />
          <TopList title="Landing paths" icon={Link2} items={data.topLandingPaths} emptyText="No landing paths tracked yet." />
          <TopList title="Campaigns" icon={Megaphone} items={data.topCampaigns} emptyText="No UTM campaigns seen yet." />
          <div className="lux-card">
            <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><FileText className="h-4 w-4 text-[#F4A62A]" /> Content footprint</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-white/75">Published blog posts</span><span className="text-white font-bold" data-testid="text-footprint-published">{footprint.publishedBlogPosts}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/75">Tracked content pages</span><span className="text-white font-bold" data-testid="text-footprint-tracked">{footprint.trackedContentPages}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/75">Published, never viewed</span><span className={`font-bold ${footprint.publishedNeverViewed > 0 ? "text-amber-400" : "text-white"}`} data-testid="text-footprint-never-viewed">{footprint.publishedNeverViewed}</span></div>
            </div>
          </div>
          <div className="lux-card">
            <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-3"><CheckCircle2 className="h-4 w-4 text-[#F4A62A]" /> Data integrity</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-white/75">Duplicate landing groups</span><span className={`font-bold ${diagnostics.duplicateLandingGroups > 0 ? "text-red-400" : "text-emerald-400"}`} data-testid="text-diag-dup-landings">{diagnostics.duplicateLandingGroups}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/75">Landings w/o session</span><span className="text-white font-bold" data-testid="text-diag-no-session">{diagnostics.landingsWithoutSession}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/75">Content w/o landing</span><span className="text-white font-bold" data-testid="text-diag-content-no-landing">{diagnostics.contentSessionsWithoutLanding}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/75">Unclassified referral hosts</span><span className="text-white font-bold" data-testid="text-diag-referral-hosts">{diagnostics.referralHostCount}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/75">Funnel join coverage</span><span className="text-white font-bold" data-testid="text-diag-funnel-coverage">{fmtPct(diagnostics.funnelJoinCoveragePct)}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/75">Revenue events w/ session</span><span className="text-white font-bold" data-testid="text-diag-revenue-session">{fmtPct(diagnostics.revenueEventsWithSessionPct)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="lux-card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-white/70 text-sm font-bold uppercase tracking-wide">Trends</h2>
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPeriodTab(t)}
                data-testid={`tab-search-${t}`}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  periodTab === t ? "text-black" : "text-white/60 bg-white/5 hover:bg-white/10"
                }`}
                style={periodTab === t ? { background: GOLD } : undefined}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <TrendTable buckets={periodBuckets} />
      </div>

      <div className="lux-card space-y-3">
        <p className="text-white/40 text-xs leading-relaxed"><span className="text-white/60 font-semibold">Authority formula:</span> {data.authorityFormula}</p>
        <p className="text-white/40 text-xs leading-relaxed" data-testid="text-search-attribution-note"><span className="text-white/60 font-semibold">Attribution note:</span> {data.attributionNote}</p>
        <p className="text-white/30 text-xs">Generated {new Date(data.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
