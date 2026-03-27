import type { SourcePerformanceSnapshot } from "@/types/growth";

export function SourcePerformancePanel({ rows }: { rows: SourcePerformanceSnapshot[] }) {
  if (!rows.length) {
    return (
      <div className="lux-card p-6 text-center text-slate-400 text-sm">
        No source performance data yet. Generate to populate.
      </div>
    );
  }
  return (
    <div className="lux-card overflow-hidden" data-testid="panel-source-performance">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Source Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-right">Visits</th>
              <th className="px-4 py-3 text-right">Qualified</th>
              <th className="px-4 py-3 text-right">Bookings</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10 text-slate-200 hover:bg-white/5" data-testid={`row-source-${row.id}`}>
                <td className="px-4 py-3 font-medium">{row.sourceName}</td>
                <td className="px-4 py-3 text-right">{row.visits.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{row.qualifiedLeads}</td>
                <td className="px-4 py-3 text-right">{row.bookings}</td>
                <td className="px-4 py-3 text-right">{row.paidOrders}</td>
                <td className="px-4 py-3 text-right">${(row.revenue / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#F4A62A]">{row.qualityScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
