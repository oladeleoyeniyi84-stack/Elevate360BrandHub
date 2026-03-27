import { AlertTriangle, RefreshCw } from "lucide-react";
import type { RollbackEvent } from "@/types/execution";

const STATUS_COLORS: Record<string, string> = {
  triggered: "text-orange-400",
  completed: "text-green-400",
  failed:    "text-red-400",
};

type Props = {
  events: RollbackEvent[];
  onCheck: () => void;
  checking?: boolean;
};

export function RollbackAlertsPanel({ events, onCheck, checking }: Props) {
  const active = events.filter((e) => e.status === "triggered");

  return (
    <div className="lux-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${active.length > 0 ? "text-orange-400" : "text-gold"}`} />
          <h3 className="text-white font-semibold text-sm">Rollback Alerts</h3>
          {active.length > 0 && (
            <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">{active.length} active</span>
          )}
        </div>
        <button
          data-testid="button-rollback-check"
          onClick={onCheck}
          disabled={checking}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition px-3 py-1 rounded lux-card"
        >
          <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "Check Now"}
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-6">No rollback events — AI will auto-detect performance drops</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {events.map((e) => (
            <div key={e.id} data-testid={`rollback-event-${e.id}`}
              className="lux-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[e.status] ?? "text-white/40"}`}>
                  {e.status}
                </span>
                <span className="text-white/30 text-xs">Change #{e.appliedChangeId}</span>
                <span className="text-white/20 text-xs">{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
              {e.reason && <p className="text-white/60 text-xs mt-1">{e.reason}</p>}
              {e.metricsAfterJson && (
                <div className="text-white/25 text-xs mt-1 space-y-0.5">
                  {Object.entries(e.metricsAfterJson).slice(0, 3).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
