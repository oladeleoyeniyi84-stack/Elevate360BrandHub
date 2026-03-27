import { GitMerge, RotateCcw } from "lucide-react";
import type { AppliedChange } from "@/types/execution";

const STATUS_COLORS: Record<string, string> = {
  proposed:    "text-white/40",
  approved:    "text-blue-400",
  applied:     "text-green-400",
  rolled_back: "text-orange-400",
  rejected:    "text-red-400",
};

const AREA_ICONS: Record<string, string> = {
  offer: "🎯", cta: "📢", links: "🔗", experiment: "🧪", override: "⚙️",
};

type Props = {
  changes: AppliedChange[];
  onRollback: (id: number) => void;
  onApplyNow: () => void;
  applying?: boolean;
};

export function AppliedChangesPanel({ changes, onRollback, onApplyNow, applying }: Props) {
  return (
    <div className="lux-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-gold" />
          <h3 className="text-white font-semibold text-sm">Applied Changes Ledger</h3>
          {changes.length > 0 && (
            <span className="text-white/30 text-xs">{changes.length} total</span>
          )}
        </div>
        <button
          data-testid="button-apply-now"
          onClick={onApplyNow}
          disabled={applying}
          className="text-xs text-white/40 hover:text-white transition px-3 py-1 rounded lux-card"
        >
          {applying ? "Applying…" : "Apply Now"}
        </button>
      </div>

      {changes.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-6">No changes applied yet — AI execution engine will populate this</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {changes.map((c) => {
            const before = c.beforeJson ? JSON.stringify(c.beforeJson).slice(0, 60) : "—";
            const after = c.afterJson ? JSON.stringify(c.afterJson).slice(0, 60) : "—";
            return (
              <div key={c.id} data-testid={`change-row-${c.id}`}
                className="lux-panel p-3 rounded-lg flex items-start gap-3">
                <span className="text-base w-5 text-center flex-shrink-0">{AREA_ICONS[c.area] ?? "📋"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium capitalize">{c.changeType.replace(/_/g, " ")}</span>
                    <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[c.status] ?? "text-white/40"}`}>{c.status.replace("_", " ")}</span>
                    <span className="text-white/30 text-xs">by {c.appliedBy}</span>
                  </div>
                  {c.reason && <p className="text-white/50 text-xs mt-0.5 truncate">{c.reason}</p>}
                  <div className="text-white/25 text-xs mt-1 space-y-0.5">
                    <div className="truncate">Before: {before}</div>
                    <div className="truncate">After: {after}</div>
                  </div>
                  <div className="text-white/25 text-xs mt-0.5">
                    Confidence: {c.confidence}% · Risk: {c.riskScore} · {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {c.status === "applied" && (
                  <button data-testid={`btn-rollback-${c.id}`} onClick={() => onRollback(c.id)}
                    className="p-1.5 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition flex-shrink-0" title="Roll back">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
