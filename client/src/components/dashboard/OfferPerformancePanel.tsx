import type { OfferPerformanceSnapshot } from "@/types/growth";

export function OfferPerformancePanel({ rows }: { rows: OfferPerformanceSnapshot[] }) {
  if (!rows.length) {
    return (
      <div className="lux-card p-6 text-center text-slate-400 text-sm">
        No offer performance data yet. Generate to populate.
      </div>
    );
  }
  return (
    <div className="lux-card overflow-hidden" data-testid="panel-offer-performance">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Offer Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">Offer</th>
              <th className="px-4 py-3 text-left">Intent</th>
              <th className="px-4 py-3 text-right">Rec.</th>
              <th className="px-4 py-3 text-right">Accepted</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Close %</th>
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10 text-slate-200 hover:bg-white/5" data-testid={`row-offer-${row.id}`}>
                <td className="px-4 py-3 font-medium">{row.offerSlug}</td>
                <td className="px-4 py-3 text-slate-400">{row.intent || "—"}</td>
                <td className="px-4 py-3 text-right">{row.recommendedCount}</td>
                <td className="px-4 py-3 text-right">{row.acceptedCount}</td>
                <td className="px-4 py-3 text-right">{row.paidCount}</td>
                <td className="px-4 py-3 text-right">{row.closeRate}%</td>
                <td className="px-4 py-3 text-right font-semibold text-[#F4A62A]">{row.performanceScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
