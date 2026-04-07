import { Shield, ToggleLeft, ToggleRight } from "lucide-react";
import type { ExecutionPolicy } from "@/types/execution";

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  suggest_only:     { label: "Suggest Only",    color: "text-white/40" },
  approval_required:{ label: "Needs Approval",  color: "text-yellow-400" },
  auto_apply_safe:  { label: "Auto-Apply",       color: "text-green-400" },
};

const AREA_ICONS: Record<string, string> = {
  offer: "🎯", cta: "📢", links: "🔗", experiment: "🧪", override: "⚙️",
};

type Props = {
  policies: ExecutionPolicy[];
  onModeChange: (policyKey: string, mode: string) => void;
  onToggle: (policyKey: string, enabled: boolean) => void;
  seeding?: boolean;
  onSeed: () => void;
};

export function ExecutionPoliciesPanel({ policies, onModeChange, onToggle, seeding, onSeed }: Props) {
  const modes = ["suggest_only", "approval_required", "auto_apply_safe"];

  return (
    <div className="lux-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gold" />
          <h3 className="text-white font-semibold text-sm">Execution Policies</h3>
        </div>
        <button
          data-testid="button-seed-policies"
          onClick={onSeed}
          disabled={seeding}
          className="text-xs text-white/40 hover:text-white transition px-3 py-1 rounded lux-card"
        >
          {seeding ? "Seeding…" : "Load Defaults"}
        </button>
      </div>

      {policies.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-6">No policies configured — click Load Defaults to initialise</p>
      ) : (
        <div className="space-y-2">
          {policies.map((p) => {
            const modeInfo = MODE_LABELS[p.mode] ?? { label: p.mode, color: "text-white/60" };
            return (
              <div key={p.policyKey} data-testid={`policy-row-${p.policyKey}`}
                className="flex items-center gap-3 lux-panel p-3 rounded-lg">
                <span className="text-lg w-6 text-center">{AREA_ICONS[p.area] ?? "📋"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium capitalize">{p.area}</span>
                    <span className={`text-xs font-semibold ${modeInfo.color}`}>{modeInfo.label}</span>
                  </div>
                  <div className="text-white/30 text-xs mt-0.5">
                    Min confidence: {p.minConfidence}% · Max risk: {p.maxRiskScore}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    data-testid={`select-mode-${p.policyKey}`}
                    value={p.mode}
                    onChange={(e) => onModeChange(p.policyKey, e.target.value)}
                    className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                  >
                    {modes.map((m) => (
                      <option key={m} value={m}>{MODE_LABELS[m]?.label ?? m}</option>
                    ))}
                  </select>
                  <button
                    data-testid={`toggle-policy-${p.policyKey}`}
                    onClick={() => onToggle(p.policyKey, !p.isEnabled)}
                    className="text-white/50 hover:text-white transition"
                  >
                    {p.isEnabled ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
