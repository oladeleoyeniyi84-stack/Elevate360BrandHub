// Phase 72.4R — SEO audit tabs: health overview, structured data, metadata,
// social cards, and index coverage. All data comes from stored audit runs
// against server-delivered HTML (what social bots / non-JS crawlers see).

import { Activity, Braces, FileText, Share2, ListChecks } from "lucide-react";
import type {
  SearchIntelDashboardPayload,
  IndexabilityCheckItem,
} from "@shared/types/searchIntel";
import { Stat, SectionCard, EmptyCard, OkBadge, fmtPct } from "./shared";

export function AuditNotReadyCard({ context }: { context: string }) {
  return (
    <EmptyCard
      testId="card-audit-not-run"
      title="No SEO audit stored yet"
      message={`${context} Run an audit from the Sync Status tab — it fetches every core page and published post as server-delivered HTML and stores the findings.`}
    />
  );
}

export function SeoHealthTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const { structuredData, metadata, indexability } = payload;
  const lastRun = payload.syncStatus.lastAuditRun;
  if (!metadata || !indexability || !structuredData) {
    return <AuditNotReadyCard context="SEO health combines metadata, structured-data and indexability findings into one view." />;
  }
  const invalidSchemas = structuredData.coverage.reduce((s, c) => s + c.invalidCount, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={FileText} label="Pages audited" value={metadata.pagesAudited} testId="stat-seo-pages-audited"
          sub={lastRun ? <span>last run {new Date(lastRun.startedAt).toLocaleString()}</span> : undefined} />
        <Stat icon={Activity} label="Pages with issues" value={metadata.pagesWithIssues} testId="stat-seo-pages-issues" />
        <Stat icon={ListChecks} label="Broken internal links" value={indexability.brokenInternalLinks.length} testId="stat-seo-broken-links"
          sub={<span>{indexability.internalLinksChecked} checked</span>} />
        <Stat icon={Braces} label="Invalid schema blocks" value={invalidSchemas} testId="stat-seo-invalid-schema" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Crawl foundations" icon={ListChecks}>
          <div className="space-y-2 text-sm mt-2">
            <div className="flex items-center justify-between"><span className="text-white/75">robots.txt reachable & permissive</span><OkBadge ok={indexability.robotsTxtOk} /></div>
            <div className="flex items-center justify-between"><span className="text-white/75">sitemap.xml reachable & parseable</span><OkBadge ok={indexability.sitemapOk} /></div>
            <div className="flex items-center justify-between"><span className="text-white/75">Sitemap URLs failing</span><span className={`font-bold ${indexability.sitemapUrlFailures.length > 0 ? "text-red-400" : "text-emerald-400"}`}>{indexability.sitemapUrlFailures.length}<span className="text-white/40 font-normal"> / {indexability.sitemapUrlsChecked} checked</span></span></div>
            <div className="flex items-center justify-between"><span className="text-white/75">Redirect chains</span><span className={`font-bold ${indexability.redirectChains.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>{indexability.redirectChains.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-white/75">Pages with noindex</span><span className={`font-bold ${indexability.noindexPages.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>{indexability.noindexPages.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-white/75">Canonical issues</span><span className={`font-bold ${indexability.canonicalIssues.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>{indexability.canonicalIssues.length}</span></div>
          </div>
        </SectionCard>
        <SectionCard title="Duplicate metadata" icon={FileText} subtitle="Across server-delivered HTML — see the audit note below.">
          <div className="space-y-2 text-sm mt-2">
            <div className="flex items-center justify-between"><span className="text-white/75">Duplicate title groups</span><span className={`font-bold ${metadata.duplicateTitles.length > 0 ? "text-amber-400" : "text-emerald-400"}`} data-testid="stat-seo-dup-titles">{metadata.duplicateTitles.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-white/75">Duplicate description groups</span><span className={`font-bold ${metadata.duplicateDescriptions.length > 0 ? "text-amber-400" : "text-emerald-400"}`} data-testid="stat-seo-dup-descriptions">{metadata.duplicateDescriptions.length}</span></div>
          </div>
        </SectionCard>
      </div>
      <p className="text-white/30 text-xs leading-relaxed" data-testid="text-seo-health-note">{metadata.note}</p>
    </div>
  );
}

export function StructuredDataTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const sd = payload.structuredData;
  if (!sd) return <AuditNotReadyCard context="The structured-data audit validates JSON-LD blocks (Organization, WebSite, Person, Article) on every audited page." />;
  return (
    <div className="space-y-6">
      <SectionCard title="Schema coverage" icon={Braces} subtitle={`Audited ${sd.pagesAudited} pages · ${new Date(sd.auditedAt).toLocaleString()}`}>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Schema type</th>
                <th className="text-right py-2 px-2">Expected on</th>
                <th className="text-right py-2 px-2">Present (expected)</th>
                <th className="text-right py-2 px-2">Present anywhere</th>
                <th className="text-right py-2 pl-2">Invalid</th>
              </tr>
            </thead>
            <tbody>
              {sd.coverage.map((c) => (
                <tr key={c.schemaType} className="border-t border-white/5 text-white/80" data-testid={`row-schema-coverage-${c.schemaType}`}>
                  <td className="py-2 pr-4 text-white/85">{c.schemaType}</td>
                  <td className="text-right py-2 px-2">{c.expectedPages}</td>
                  <td className={`text-right py-2 px-2 font-bold ${c.presentOnExpected < c.expectedPages ? "text-amber-400" : "text-emerald-400"}`}>{c.presentOnExpected}</td>
                  <td className="text-right py-2 px-2">{c.presentAnywhere}</td>
                  <td className={`text-right py-2 pl-2 font-bold ${c.invalidCount > 0 ? "text-red-400" : "text-white/60"}`}>{c.invalidCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Per-page findings" subtitle="Only pages where a schema type is expected or present are listed.">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Path</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-center py-2 px-2">Expected</th>
                <th className="text-center py-2 px-2">Present</th>
                <th className="text-center py-2 px-2">Valid</th>
                <th className="text-left py-2 pl-4">Issues</th>
              </tr>
            </thead>
            <tbody>
              {sd.items.map((it, i) => (
                <tr key={`${it.path}-${it.schemaType}`} className="border-t border-white/5 text-white/80" data-testid={`row-schema-item-${i}`}>
                  <td className="py-2 pr-4 break-all max-w-[220px]">{it.path}</td>
                  <td className="py-2 px-2 text-white/60">{it.schemaType}</td>
                  <td className="text-center py-2 px-2">{it.expected ? "✓" : "—"}</td>
                  <td className="text-center py-2 px-2">{it.present ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✕</span>}</td>
                  <td className="text-center py-2 px-2">{it.valid === null ? "—" : it.valid ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✕</span>}</td>
                  <td className="py-2 pl-4 text-white/50 text-xs">{it.issues.join("; ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <p className="text-white/30 text-xs leading-relaxed">{sd.note}</p>
    </div>
  );
}

export function MetadataTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const md = payload.metadata;
  if (!md) return <AuditNotReadyCard context="The metadata audit checks titles, descriptions, canonicals and robots directives on every audited page." />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={FileText} label="Pages audited" value={md.pagesAudited} testId="stat-meta-pages" />
        <Stat icon={Activity} label="Pages with issues" value={md.pagesWithIssues} testId="stat-meta-issues" />
        <Stat icon={FileText} label="Duplicate titles" value={md.duplicateTitles.length} testId="stat-meta-dup-titles" />
        <Stat icon={FileText} label="Duplicate descriptions" value={md.duplicateDescriptions.length} testId="stat-meta-dup-desc" />
      </div>
      {(md.duplicateTitles.length > 0 || md.duplicateDescriptions.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {md.duplicateTitles.length > 0 && (
            <SectionCard title="Duplicate titles">
              <div className="space-y-2 mt-2 text-sm">
                {md.duplicateTitles.map((d, i) => (
                  <div key={i} data-testid={`row-dup-title-${i}`}>
                    <p className="text-white/80 break-all">“{d.value}” <span className="text-amber-400 font-bold">×{d.count}</span></p>
                    <p className="text-white/40 text-xs break-all">{d.paths.join(", ")}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {md.duplicateDescriptions.length > 0 && (
            <SectionCard title="Duplicate descriptions">
              <div className="space-y-2 mt-2 text-sm">
                {md.duplicateDescriptions.map((d, i) => (
                  <div key={i} data-testid={`row-dup-desc-${i}`}>
                    <p className="text-white/80 break-all">“{d.value.slice(0, 90)}{d.value.length > 90 ? "…" : ""}” <span className="text-amber-400 font-bold">×{d.count}</span></p>
                    <p className="text-white/40 text-xs break-all">{d.paths.join(", ")}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
      <SectionCard title="Per-page metadata" subtitle="Title 30–60 chars and description 70–160 chars are treated as healthy ranges.">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Path</th>
                <th className="text-right py-2 px-2">HTTP</th>
                <th className="text-right py-2 px-2">Title len</th>
                <th className="text-right py-2 px-2">Desc len</th>
                <th className="text-center py-2 px-2">Canonical</th>
                <th className="text-center py-2 px-2">Noindex</th>
                <th className="text-left py-2 pl-4">Issues</th>
              </tr>
            </thead>
            <tbody>
              {md.pages.map((p, i) => (
                <tr key={p.path} className="border-t border-white/5 text-white/80" data-testid={`row-meta-page-${i}`}>
                  <td className="py-2 pr-4 break-all max-w-[220px]">{p.path}</td>
                  <td className={`text-right py-2 px-2 ${p.httpStatus >= 400 ? "text-red-400 font-bold" : ""}`}>{p.httpStatus}</td>
                  <td className={`text-right py-2 px-2 ${p.titleLength < 30 || p.titleLength > 60 ? "text-amber-400" : ""}`}>{p.titleLength}</td>
                  <td className={`text-right py-2 px-2 ${p.descriptionLength < 70 || p.descriptionLength > 160 ? "text-amber-400" : ""}`}>{p.descriptionLength}</td>
                  <td className="text-center py-2 px-2">{p.canonicalOk === null ? "—" : p.canonicalOk ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✕</span>}</td>
                  <td className="text-center py-2 px-2">{p.noindex ? <span className="text-red-400 font-bold">yes</span> : "—"}</td>
                  <td className="py-2 pl-4 text-white/50 text-xs">{p.issues.join("; ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <p className="text-white/30 text-xs leading-relaxed" data-testid="text-meta-note">{md.note}</p>
    </div>
  );
}

export function SocialTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const md = payload.metadata;
  if (!md) return <AuditNotReadyCard context="The social audit checks Open Graph and Twitter Card tags — what link previews show on social platforms and chat apps." />;
  const missingOgImage = md.pages.filter((p) => !p.ogImage).length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat icon={Share2} label="Pages audited" value={md.pagesAudited} testId="stat-social-pages" />
        <Stat icon={Share2} label="Missing og:image" value={missingOgImage} testId="stat-social-missing-og-image" />
        <Stat icon={Share2} label="Coverage" value={fmtPct(md.pagesAudited > 0 ? Math.round(((md.pagesAudited - missingOgImage) / md.pagesAudited) * 100) : null)} testId="stat-social-coverage" />
      </div>
      <SectionCard title="Open Graph & Twitter Cards" icon={Share2} subtitle="✓ = tag present in server-delivered HTML (what social scrapers actually read).">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Path</th>
                <th className="text-center py-2 px-2">og:title</th>
                <th className="text-center py-2 px-2">og:desc</th>
                <th className="text-center py-2 px-2">og:image</th>
                <th className="text-center py-2 px-2">tw:title</th>
                <th className="text-center py-2 px-2">tw:desc</th>
                <th className="text-center py-2 pl-2">tw:image</th>
              </tr>
            </thead>
            <tbody>
              {md.pages.map((p, i) => {
                const cell = (ok: boolean) => ok ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✕</span>;
                return (
                  <tr key={p.path} className="border-t border-white/5 text-white/80" data-testid={`row-social-${i}`}>
                    <td className="py-2 pr-4 break-all max-w-[240px]">{p.path}</td>
                    <td className="text-center py-2 px-2">{cell(p.ogTitle)}</td>
                    <td className="text-center py-2 px-2">{cell(p.ogDescription)}</td>
                    <td className="text-center py-2 px-2">{cell(p.ogImage)}</td>
                    <td className="text-center py-2 px-2">{cell(p.twitterTitle)}</td>
                    <td className="text-center py-2 px-2">{cell(p.twitterDescription)}</td>
                    <td className="text-center py-2 pl-2">{cell(p.twitterImage)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <p className="text-white/30 text-xs leading-relaxed">{md.note}</p>
    </div>
  );
}

function CheckItemTable({ items, testPrefix }: { items: IndexabilityCheckItem[]; testPrefix: string }) {
  if (items.length === 0) return <p className="text-emerald-400/70 text-sm mt-2">No issues found.</p>;
  return (
    <div className="space-y-2 mt-2 text-sm">
      {items.map((it, i) => (
        <div key={`${it.kind}-${it.url}-${i}`} className="flex items-start justify-between gap-3" data-testid={`row-${testPrefix}-${i}`}>
          <span className="text-white/80 break-all">{it.url}</span>
          <span className="text-white/45 text-xs whitespace-nowrap">{it.httpStatus ?? "—"}{it.detail ? ` · ${it.detail}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

export function IndexCoverageTab({ payload }: { payload: SearchIntelDashboardPayload }) {
  const ix = payload.indexability;
  if (!ix) return <AuditNotReadyCard context="The indexability audit verifies robots.txt, sitemap.xml, sitemap URL health, redirect chains, canonicals and internal links." />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={ListChecks} label="robots.txt" value={ix.robotsTxtOk ? "OK" : "Issue"} testId="stat-index-robots" />
        <Stat icon={ListChecks} label="sitemap.xml" value={ix.sitemapOk ? "OK" : "Issue"} testId="stat-index-sitemap"
          sub={<span>{ix.sitemapUrlCount} URLs · {ix.sitemapUrlsChecked} checked</span>} />
        <Stat icon={ListChecks} label="Redirect chains" value={ix.redirectChains.length} testId="stat-index-redirects" />
        <Stat icon={ListChecks} label="Broken internal links" value={ix.brokenInternalLinks.length} testId="stat-index-broken-links"
          sub={<span>{ix.internalLinksChecked} checked</span>} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Sitemap URL failures">
          <CheckItemTable items={ix.sitemapUrlFailures} testPrefix="sitemap-fail" />
        </SectionCard>
        <SectionCard title="Redirect chains" subtitle="Multi-hop redirects waste crawl budget and dilute signals.">
          <CheckItemTable items={ix.redirectChains} testPrefix="redirect-chain" />
        </SectionCard>
        <SectionCard title="Noindex pages" subtitle="Pages excluded from search indexes via meta robots.">
          <CheckItemTable items={ix.noindexPages} testPrefix="noindex" />
        </SectionCard>
        <SectionCard title="Canonical issues">
          <CheckItemTable items={ix.canonicalIssues} testPrefix="canonical-issue" />
        </SectionCard>
      </div>
      <SectionCard title="Broken internal links">
        <CheckItemTable items={ix.brokenInternalLinks} testPrefix="broken-link" />
      </SectionCard>
      <p className="text-white/30 text-xs leading-relaxed">{ix.note}</p>
    </div>
  );
}
