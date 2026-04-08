import type { RevenueRecoveryAction } from "@/types/automation";
import { Button } from "@/components/ui/button";

type Props = {
  rows: RevenueRecoveryAction[];
  onMark: (id: number, status: RevenueRecoveryAction["status"]) => void;
};

function niceType(value: RevenueRecoveryAction["recoveryType"]) {
  switch (value) {
    case "accepted_not_paid": return "Accepted / Not Paid";
    case "abandoned_checkout": return "Abandoned Checkout";
    case "stale_fulfillment": return "Stale Fulfillment";
    default: return value;
  }
}

export function RecoveryQueueTable({ rows, onMark }: Props) {
  return (
    <div className="lux-card overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Revenue Recovery Queue</h3>
        <p className="text-sm text-slate-400">Accepted-not-paid, abandoned checkout, and stale fulfillment actions.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Target</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10 text-slate-200" data-testid={`row-recovery-${row.id}`}>
                <td className="px-4 py-3">{niceType(row.recoveryType)}</td>
                <td className="px-4 py-3 font-semibold text-[#F4A62A]" data-testid={`text-priority-${row.id}`}>{row.priorityScore}</td>
                <td className="px-4 py-3">{row.targetEmail || row.targetPhone || "—"}</td>
                <td className="px-4 py-3 max-w-[340px]">{row.reason || "—"}</td>
                <td className="px-4 py-3" data-testid={`status-recovery-${row.id}`}>{row.status}</td>
                <td className="px-4 py-3">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" data-testid={`button-queue-${row.id}`} onClick={() => onMark(row.id, "queued")}>Queue</Button>
                    <Button size="sm" variant="outline" data-testid={`button-won-${row.id}`} onClick={() => onMark(row.id, "won")}>Won</Button>
                    <Button size="sm" variant="outline" data-testid={`button-ignore-recovery-${row.id}`} onClick={() => onMark(row.id, "ignored")}>Ignore</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No recovery actions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
