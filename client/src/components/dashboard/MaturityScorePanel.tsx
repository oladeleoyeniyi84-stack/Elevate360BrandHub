import { Award, TrendingUp, RefreshCw } from "lucide-react";
import type { MaturityScores, QuarterlyStrategyReport } from "@/types/founder";

type Props = {
  maturity: MaturityScores | null;
  quarterly: QuarterlyStrategyReport | null;
  onGenerateStrategy: () => void;
  generating?: boolean;
};

function ScoreRow({ label, score, detail }: { label: string; score: number; detail?: string }) {
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#F4A62A" : "#f87171";
  const grade = score >= 80 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20`, color }}>
        {grade}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-medium">{label}</span>
          <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
          </div>
          <span className="text-xs font-bold w-6 text-right" style={{ color }}>{score}</span>
        </div>
        {detail && <div className="text-white/25 text-xs mt-0.5 truncate">{detail}</div>}
      </div>
    </div>
  );
}

export function MaturityScorePanel({ maturity, quarterly, onGenerateStrategy, generating }: Props) {
  const overall = maturity?.overallMaturityScore ?? 0;
  const overallColor = overall >= 75 ? "#34d399" : overall >= 50 ? "#F4A62A" : "#f87171";
  const grade = overall >= 80 ? "A" : overall >= 70 ? "B" : overall >= 55 ? "C" : overall >= 40 ? "D" : "F";

  return (
    <div className="lux-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-gold" />
          <h3 className="text-white font-semibold text-sm">Platform Maturity Score</h3>
        </div>
      </div>

      {maturity ? (
        <>
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2"
              style={{ borderColor: `${overallColor}40`, background: `${overallColor}08` }}>
              <div className="text-3xl font-bold leading-none" style={{ color: overallColor }}>{grade}</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: overallColor }}>{overall}/100</div>
            </div>
            <div className="flex-1 space-y-2.5">
              <ScoreRow label="Job Health" score={maturity.jobHealthScore} detail={maturity.details.jobHealth} />
              <ScoreRow label="Revenue Truth" score={maturity.revenueTruthScore} detail={maturity.details.revenueTruth} />
              <ScoreRow label="Audit Health" score={maturity.auditHealthScore} detail={maturity.details.auditHealth} />
              <ScoreRow label="Execution Safety" score={maturity.executionSafetyScore} detail={maturity.details.executionSafety} />
              <ScoreRow label="Growth Health" score={maturity.growthHealthScore} detail={maturity.details.growthHealth} />
            </div>
          </div>
        </>
      ) : (
        <p className="text-white/30 text-sm text-center py-4">Loading maturity scores…</p>
      )}

      <div className="border-t border-white/5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <h4 className="text-white font-semibold text-sm">Quarterly Strategy Report</h4>
          </div>
          <button
            data-testid="button-generate-quarterly"
            onClick={onGenerateStrategy}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition px-3 py-1 rounded lux-card"
          >
            <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating…" : "Generate Report"}
          </button>
        </div>

        {quarterly ? (
          <div className="lux-panel p-4 rounded-lg space-y-3">
            <div className="text-white/30 text-xs">
              Period: {new Date(quarterly.periodStart).toLocaleDateString()} – {new Date(quarterly.periodEnd).toLocaleDateString()}
            </div>
            <pre className="text-white/70 text-xs whitespace-pre-wrap leading-relaxed font-sans">{quarterly.summary}</pre>
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-4">No quarterly report yet — click Generate Report to create one</p>
        )}
      </div>
    </div>
  );
}
