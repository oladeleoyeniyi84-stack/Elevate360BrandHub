import { Activity, AlertTriangle, ShieldCheck, Power, AlertOctagon } from "lucide-react";
import type { SystemHealthSnapshot } from "@/types/founder";

function ScoreGauge({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#F4A62A" : "#f87171";
  return (
    <div className="lux-panel p-3 rounded-lg text-center">
      <div className="text-2xl font-bold mb-1" style={{ color }}>{score}</div>
      <div className="text-white/40 text-xs">{label}</div>
      <div className="mt-2 bg-white/5 rounded-full h-1 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

type Props = {
  latest: SystemHealthSnapshot | null;
  history: SystemHealthSnapshot[];
  onHealthCheck: () => void;
  onSafeMode: (enabled: boolean) => void;
  onKillSwitch: () => void;
  checking?: boolean;
};

export function SystemHealthPanel({ latest, history, onHealthCheck, onSafeMode, onKillSwitch, checking }: Props) {
  const warnings = (latest?.metaJson as any)?.warnings ?? [];

  return (
    <div className="lux-card p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gold" />
          <h3 className="text-white font-semibold text-sm">System Health</h3>
          {latest && (
            <span className="text-white/30 text-xs">
              Last check: {new Date(latest.snapshotTime).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            data-testid="button-health-check"
            onClick={onHealthCheck}
            disabled={checking}
            className="text-xs text-white/40 hover:text-white transition px-3 py-1 rounded lux-card flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3 w-3" />
            {checking ? "Checking…" : "Run Health Check"}
          </button>
          <button
            data-testid="button-safe-mode"
            onClick={() => onSafeMode(true)}
            className="text-xs text-yellow-400/80 hover:text-yellow-400 transition px-3 py-1 rounded lux-card flex items-center gap-1.5"
          >
            <AlertTriangle className="h-3 w-3" />
            Safe Mode
          </button>
          <button
            data-testid="button-kill-switch"
            onClick={onKillSwitch}
            className="text-xs text-red-400/80 hover:text-red-400 transition px-3 py-1 rounded lux-card flex items-center gap-1.5"
          >
            <Power className="h-3 w-3" />
            Kill Switch
          </button>
        </div>
      </div>

      {latest ? (
        <>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <ScoreGauge label="Jobs" score={latest.jobHealthScore} />
            <ScoreGauge label="Revenue" score={latest.revenueTruthScore} />
            <ScoreGauge label="Audit" score={latest.auditHealthScore} />
            <ScoreGauge label="Execution" score={latest.executionSafetyScore} />
            <ScoreGauge label="Growth" score={latest.growthHealthScore} />
            <ScoreGauge label="Overall" score={latest.overallMaturityScore} />
          </div>

          {warnings.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-white/40 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="h-3 w-3 text-orange-400" />
                Warnings ({warnings.length})
              </div>
              {warnings.map((w: string, i: number) => (
                <div key={i} className="lux-panel p-2 rounded text-xs text-orange-300/80">{w}</div>
              ))}
            </div>
          )}

          {history.length > 1 && (
            <div>
              <div className="text-white/30 text-xs mb-2">Score history (overall maturity)</div>
              <div className="flex items-end gap-1 h-8">
                {history.slice().reverse().map((h, i) => {
                  const score = h.overallMaturityScore;
                  const color = score >= 75 ? "#34d399" : score >= 50 ? "#F4A62A" : "#f87171";
                  return (
                    <div key={h.id} title={`${score} — ${new Date(h.snapshotTime).toLocaleDateString()}`}
                      className="flex-1 rounded-sm transition-all"
                      style={{ height: `${Math.max(8, score)}%`, background: color, opacity: i === history.length - 1 ? 1 : 0.5 }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-white/30 text-sm text-center py-6">No health snapshots yet — run a health check to initialise</p>
      )}
    </div>
  );
}
