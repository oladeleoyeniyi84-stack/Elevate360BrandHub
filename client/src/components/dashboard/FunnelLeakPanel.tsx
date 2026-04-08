import type { FunnelLeakReport } from "@/types/growth";

const severityColor = (score: number) => {
  if (score >= 80) return "text-rose-400";
  if (score >= 50) return "text-amber-400";
  return "text-emerald-400";
};

export function FunnelLeakPanel({ rows }: { rows: FunnelLeakReport[] }) {
  if (!rows.length) {
    return (
      <div className="lux-card p-6 text-center text-slate-400 text-sm">
        No funnel leak data yet. Generate to populate.
      </div>
    );
  }
  return (
    <div className="lux-card p-5" data-testid="panel-funnel-leaks">
      <h3 className="text-lg font-semibold text-white mb-4">Funnel Leaks</h3>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 p-4" data-testid={`card-leak-${row.id}`}>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{row.leakStage}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityColor(row.severityScore)} bg-white/5`}>
                Severity {row.severityScore}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Dropoff: <span className="font-semibold text-white">{row.dropoffCount}</span> ({row.dropoffRate}%)
            </p>
            {row.recommendedFix && (
              <p className="mt-2 text-sm text-[#F4A62A]">Fix: {row.recommendedFix}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
