import type { ContentOpportunity } from "@/types/automation";
import { Button } from "@/components/ui/button";

type Props = {
  rows: ContentOpportunity[];
  onUpdate: (id: number, status: ContentOpportunity["status"]) => void;
};

export function ContentOpportunitiesPanel({ rows, onUpdate }: Props) {
  return (
    <div className="lux-card">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Content Opportunities</h3>
        <p className="text-sm text-slate-400">AI-ranked ideas mined from chat intent, knowledge gaps, and funnel leaks.</p>
      </div>

      <div className="space-y-4 p-5">
        {rows.length === 0 && <p className="text-sm text-slate-400">No content opportunities generated yet.</p>}

        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 p-4" data-testid={`card-content-opportunity-${row.id}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#F4A62A]/15 px-2.5 py-1 text-xs font-medium text-[#F4A62A]">
                    {row.contentType}
                  </span>
                  {row.sourceIntent && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                      {row.sourceIntent}
                    </span>
                  )}
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300" data-testid={`text-score-${row.id}`}>
                    Score {row.opportunityScore}
                  </span>
                </div>
                <h4 className="mt-3 text-base font-semibold text-white">{row.topic}</h4>
                {row.recommendation && <p className="mt-2 text-sm text-slate-300">{row.recommendation}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" data-testid={`button-approve-${row.id}`} onClick={() => onUpdate(row.id, "approved")}>Approve</Button>
                <Button size="sm" variant="outline" data-testid={`button-start-${row.id}`} onClick={() => onUpdate(row.id, "in_progress")}>Start</Button>
                <Button size="sm" variant="outline" data-testid={`button-ignore-content-${row.id}`} onClick={() => onUpdate(row.id, "ignored")}>Ignore</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
