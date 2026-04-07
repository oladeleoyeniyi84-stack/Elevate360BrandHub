import { Crown, GitMerge, RotateCcw, Clock, TrendingUp, Target, Zap } from "lucide-react";
import type { FounderOverview } from "@/types/founder";

function Stat({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="lux-panel p-4 rounded-xl flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <div className="text-white font-bold text-lg leading-none">{value}</div>
        <div className="text-white/40 text-xs mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#F4A62A" : "#f87171";
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/50 text-xs w-32 truncate">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

type Props = {
  overview: FounderOverview | null;
  maturity: any | null;
  onRefresh: () => void;
  refreshing?: boolean;
};

export function FounderCommandPanel({ overview, maturity, onRefresh, refreshing }: Props) {
  const maturityScore = maturity?.overallMaturityScore ?? overview?.maturityScore ?? 0;
  const maturityColor = maturityScore >= 75 ? "#34d399" : maturityScore >= 50 ? "#F4A62A" : "#f87171";

  return (
    <div className="lux-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          <h2 className="text-white font-bold text-base">Founder Command Center</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: maturityColor }} />
            <span className="text-xs font-bold" style={{ color: maturityColor }}>
              Maturity: {maturityScore}/100
            </span>
          </div>
          <button
            data-testid="button-refresh-overview"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs text-white/40 hover:text-white transition px-3 py-1 rounded lux-card"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {overview ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Changed Today" value={overview.changedToday} icon={GitMerge} color="#34d399" />
            <Stat label="Rolled Back Today" value={overview.rolledBackToday} icon={RotateCcw} color="#f87171" />
            <Stat label="Needs Approval" value={overview.pendingApprovals} icon={Clock} color="#F4A62A" />
            <Stat label="Maturity Score" value={maturityScore} icon={Zap} color={maturityColor} />
          </div>

          {overview.topGrowthWin && (
            <div className="lux-panel p-3 rounded-lg flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wider">Top Growth Win</div>
                <div className="text-white text-sm mt-0.5">{overview.topGrowthWin.title}</div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            {overview.topSource && (
              <div className="lux-panel p-3 rounded-lg">
                <div className="text-white/40 text-xs mb-1">Top Source</div>
                <div className="text-white font-medium text-sm">{overview.topSource.sourceName}</div>
                <div className="text-white/30 text-xs">Quality: {overview.topSource.qualityScore}</div>
              </div>
            )}
            {overview.topOffer && (
              <div className="lux-panel p-3 rounded-lg">
                <div className="text-white/40 text-xs mb-1">Top Offer</div>
                <div className="text-white font-medium text-sm">{overview.topOffer.offerSlug}</div>
                <div className="text-white/30 text-xs">Score: {overview.topOffer.performanceScore}</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-white/30 text-sm text-center py-6">Loading founder overview…</p>
      )}

      {maturity && (
        <div className="space-y-2.5">
          <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Platform Health Breakdown</div>
          <ScoreBar label="Job Health" score={maturity.jobHealthScore} />
          <ScoreBar label="Revenue Truth" score={maturity.revenueTruthScore} />
          <ScoreBar label="Audit Health" score={maturity.auditHealthScore} />
          <ScoreBar label="Execution Safety" score={maturity.executionSafetyScore} />
          <ScoreBar label="Growth Health" score={maturity.growthHealthScore} />
        </div>
      )}
    </div>
  );
}
