import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { AiExplanation } from "@/types/founder";

type Props = {
  explanations: AiExplanation[];
  title?: string;
};

export function ExplainabilityPanel({ explanations, title = "AI Explanation Log" }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="lux-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-gold" />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {explanations.length > 0 && (
          <span className="text-white/30 text-xs">{explanations.length} records</span>
        )}
      </div>

      {explanations.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-6">
          No AI explanation records yet — explanations are logged when AI applies changes or makes decisions
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {explanations.map((e) => (
            <div key={e.id} data-testid={`explanation-${e.id}`} className="lux-panel rounded-lg overflow-hidden">
              <button
                className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/5 transition"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium capitalize">{e.actionType.replace(/_/g, " ")}</span>
                    <span className="text-white/40 text-xs">{e.entityType} #{e.entityId}</span>
                    <span className="text-white/30 text-xs">{e.confidence}% confidence</span>
                    {e.policyKey && <span className="text-blue-400/60 text-xs">{e.policyKey}</span>}
                  </div>
                  {e.reason && (
                    <p className="text-white/50 text-xs mt-0.5 truncate">{e.reason}</p>
                  )}
                  <div className="text-white/20 text-xs mt-0.5">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
                {expanded === e.id ? (
                  <ChevronUp className="h-3.5 w-3.5 text-white/30 flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-white/30 flex-shrink-0 mt-0.5" />
                )}
              </button>
              {expanded === e.id && e.evidenceJson && (
                <div className="px-3 pb-3 border-t border-white/5">
                  <div className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-2 mt-2">Evidence</div>
                  <div className="space-y-1">
                    {Object.entries(e.evidenceJson).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-white/40 capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                        <span className="text-white/60">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
