// Phase 67 — Cognitive OS: cross-system conflict panel.
import { GitMerge } from "lucide-react";
import type { CognitiveConflict } from "@shared/types/cognitive";

export function ConflictPanel({
  conflicts, onStatus,
}: {
  conflicts: CognitiveConflict[];
  onStatus: (id: number, status: string) => void;
}) {
  if (conflicts.length === 0) {
    return <div className="lux-card"><p className="text-white/50 text-sm">No cross-system conflicts detected. The intelligence engines are currently aligned.</p></div>;
  }
  return (
    <div className="space-y-3">
      {conflicts.map((c) => (
        <div key={c.id} className="lux-card border border-amber-400/25" data-testid={`card-conflict-${c.id}`}>
          <div className="flex items-start gap-3">
            <GitMerge className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{c.area}</span>
                <span className="text-[10px] text-amber-400">severity {c.severity}</span>
              </div>
              <h3 className="font-semibold text-white mt-1.5" data-testid={`text-conflict-title-${c.id}`}>{c.title}</h3>
              <p className="text-sm text-white/60 mt-1 whitespace-pre-line">{c.detail}</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-3">
                <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-400/80 mb-1">Expansion side</div>
                  <p className="text-xs text-white/70">{c.leftSignal}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-red-400/80 mb-1">Risk side</div>
                  <p className="text-xs text-white/70">{c.rightSignal}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => onStatus(c.id, "acknowledged")} data-testid={`button-conflict-ack-${c.id}`}
                  className="text-[11px] text-white/60 hover:text-white border border-white/15 rounded-lg px-2.5 py-1">Acknowledge</button>
                <button onClick={() => onStatus(c.id, "resolved")} data-testid={`button-conflict-resolve-${c.id}`}
                  className="text-[11px] text-white/40 hover:text-white/70 px-2.5 py-1">Mark resolved</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
