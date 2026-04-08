import type { GrowthExperiment } from "@/types/growth";
import { Button } from "@/components/ui/button";

const areaColor: Record<string, string> = {
  source: "bg-blue-500/15 text-blue-300",
  funnel: "bg-amber-500/15 text-amber-300",
  offer: "bg-emerald-500/15 text-emerald-300",
  cta: "bg-purple-500/15 text-purple-300",
  content: "bg-rose-500/15 text-rose-300",
};

const statusColor: Record<string, string> = {
  proposed: "bg-white/10 text-slate-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  running: "bg-blue-500/15 text-blue-300",
  won: "bg-[#F4A62A]/15 text-[#F4A62A]",
  lost: "bg-rose-500/15 text-rose-300",
  archived: "bg-white/5 text-slate-500",
};

export function GrowthExperimentsPanel({
  rows,
  onUpdate,
}: {
  rows: GrowthExperiment[];
  onUpdate: (id: number, status: GrowthExperiment["status"]) => void;
}) {
  if (!rows.length) {
    return (
      <div className="lux-card p-6 text-center text-slate-400 text-sm">
        No experiments yet. Generate to populate.
      </div>
    );
  }
  return (
    <div className="lux-card p-5" data-testid="panel-growth-experiments">
      <h3 className="text-lg font-semibold text-white mb-4">Growth Experiments</h3>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 p-4" data-testid={`card-experiment-${row.id}`}>
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`rounded-full px-2.5 py-1 text-xs ${areaColor[row.area] ?? "bg-white/10 text-slate-300"}`}>{row.area}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs ${statusColor[row.status] ?? "bg-white/10 text-slate-300"}`}>{row.status}</span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">Impact {row.expectedImpactScore}</span>
            </div>
            <h4 className="mt-3 text-base font-semibold text-white">{row.title}</h4>
            <p className="mt-2 text-sm text-slate-300">{row.hypothesis}</p>
            <p className="mt-2 text-sm text-[#F4A62A]">Change: {row.proposedChange}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" data-testid={`btn-approve-${row.id}`} onClick={() => onUpdate(row.id, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" data-testid={`btn-start-${row.id}`} onClick={() => onUpdate(row.id, "running")}>Start</Button>
              <Button size="sm" variant="outline" data-testid={`btn-won-${row.id}`} onClick={() => onUpdate(row.id, "won")}>Won</Button>
              <Button size="sm" variant="outline" data-testid={`btn-lost-${row.id}`} onClick={() => onUpdate(row.id, "lost")}>Lost</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
