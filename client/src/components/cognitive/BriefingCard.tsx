// Phase 67 — Cognitive OS: executive briefing card.
import type { CognitiveBriefing } from "@shared/types/cognitive";

const GOLD = "#F4A62A";

export function BriefingCard({ briefing }: { briefing: CognitiveBriefing | undefined }) {
  if (!briefing) {
    return (
      <div className="lux-card" data-testid="card-cognitive-briefing-empty">
        <p className="text-white/50 text-sm">No cognitive briefing yet. Run a scan to generate today's synthesis.</p>
      </div>
    );
  }
  const sections: any = briefing.sections ?? {};
  const load = sections.cognitiveLoad ?? 0;
  return (
    <div className="lux-card" data-testid={`card-cognitive-briefing-${briefing.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5">{briefing.periodType}</span>
          <h2 className="text-lg font-bold text-white mt-2" data-testid="text-briefing-title">{briefing.title}</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-white/40">Cognitive Load</div>
          <div className="text-2xl font-black" style={{ color: GOLD }} data-testid="text-cognitive-load">{load}</div>
        </div>
      </div>
      <p className="text-sm text-white/70 mt-3 whitespace-pre-line leading-relaxed" data-testid="text-briefing-summary">{briefing.summary}</p>
      {Array.isArray(sections.topSignals) && sections.topSignals.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Top signals feeding this</div>
          <ul className="space-y-1">
            {sections.topSignals.slice(0, 5).map((s: any, i: number) => (
              <li key={i} className="text-xs text-white/60 flex justify-between gap-3">
                <span className="truncate">[{s.system}] {s.title}</span>
                <span className="text-[#F4A62A] shrink-0">{s.score}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
