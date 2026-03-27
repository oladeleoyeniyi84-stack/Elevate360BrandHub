import type { AutonomousAlert } from "@/types/automation";
import { Button } from "@/components/ui/button";

type Props = {
  rows: AutonomousAlert[];
  onUpdate: (id: number, status: AutonomousAlert["status"]) => void;
};

const severityOrder: Record<AutonomousAlert["severity"], number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function AutonomousAlertsPanel({ rows, onUpdate }: Props) {
  const sorted = [...rows].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="lux-card">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Autonomous Alerts</h3>
        <p className="text-sm text-slate-400">Critical and high-priority issues surfaced by continuous AI/audit checks.</p>
      </div>

      <div className="space-y-4 p-5">
        {!sorted.length && <p className="text-sm text-slate-400">No autonomous alerts.</p>}

        {sorted.map((row) => (
          <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 p-4" data-testid={`card-alert-${row.id}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{row.area}</span>
                  <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs text-rose-300" data-testid={`status-severity-${row.id}`}>{row.severity}</span>
                  {row.autoFixEligible && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">auto-fix eligible</span>
                  )}
                </div>
                <h4 className="mt-3 text-base font-semibold text-white">{row.title}</h4>
                <p className="mt-2 text-sm text-slate-300">{row.summary}</p>
                {row.suggestedFix && <p className="mt-2 text-sm text-[#F4A62A]">Suggested fix: {row.suggestedFix}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" data-testid={`button-ack-${row.id}`} onClick={() => onUpdate(row.id, "acknowledged")}>Acknowledge</Button>
                <Button size="sm" variant="outline" data-testid={`button-fixed-${row.id}`} onClick={() => onUpdate(row.id, "fixed")}>Mark Fixed</Button>
                <Button size="sm" variant="outline" data-testid={`button-ignore-alert-${row.id}`} onClick={() => onUpdate(row.id, "ignored")}>Ignore</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
