// Phase 67 — Cognitive OS: unified decision table.
import { AlertTriangle, Lightbulb, Target } from "lucide-react";
import type { CognitiveDecision } from "@shared/types/cognitive";

function tone(kind: string) {
  if (kind === "risk") return { icon: AlertTriangle, color: "text-red-400", border: "border-red-400/20" };
  if (kind === "opportunity") return { icon: Lightbulb, color: "text-emerald-400", border: "border-emerald-400/20" };
  return { icon: Target, color: "text-[#F4A62A]", border: "border-[#F4A62A]/20" };
}

export function DecisionTable({
  decisions, onStatus,
}: {
  decisions: CognitiveDecision[];
  onStatus: (id: number, status: string) => void;
}) {
  if (decisions.length === 0) {
    return <div className="lux-card"><p className="text-white/50 text-sm">No open decisions. Run a scan to synthesize the latest cross-system signals.</p></div>;
  }
  return (
    <div className="space-y-3">
      {decisions.map((d) => {
        const t = tone(d.kind);
        const Icon = t.icon;
        const sources: any[] = Array.isArray(d.sources) ? (d.sources as any[]) : [];
        return (
          <div key={d.id} className={`lux-card border ${t.border}`} data-testid={`card-decision-${d.id}`}>
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${t.color}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{d.area}</span>
                  <span className="text-[10px] text-[#F4A62A]">priority {d.priority}</span>
                  <span className="text-[10px] text-white/40">confidence {d.confidence}%</span>
                  {d.source === "deepseek" && <span className="text-[10px] text-sky-400">enriched</span>}
                </div>
                <h3 className="font-semibold text-white mt-1.5" data-testid={`text-decision-title-${d.id}`}>{d.title}</h3>
                <p className="text-sm text-white/60 mt-1 whitespace-pre-line">{d.detail}</p>
                {sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sources.slice(0, 6).map((s, i) => (
                      <span key={i} className="text-[10px] text-white/45 border border-white/10 rounded px-1.5 py-0.5">{s.system}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onStatus(d.id, "acknowledged")} data-testid={`button-decision-ack-${d.id}`}
                    className="text-[11px] text-white/60 hover:text-white border border-white/15 rounded-lg px-2.5 py-1">Acknowledge</button>
                  <button onClick={() => onStatus(d.id, "dismissed")} data-testid={`button-decision-dismiss-${d.id}`}
                    className="text-[11px] text-white/40 hover:text-white/70 px-2.5 py-1">Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
