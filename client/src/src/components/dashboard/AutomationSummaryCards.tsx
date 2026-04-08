import { Loader2, AlertTriangle, RefreshCcw, Bot, FileText, Activity } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

type Props = {
  activeJobs: number;
  failedJobs24h: number;
  recoveryOpen: number;
  wonRecoveries30d: number;
  openAlerts: number;
  lastFounderBriefLabel: string;
  isLoading?: boolean;
};

export function AutomationSummaryCards({
  activeJobs,
  failedJobs24h,
  recoveryOpen,
  wonRecoveries30d,
  openAlerts,
  lastFounderBriefLabel,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="lux-card p-5 flex items-center justify-center min-h-[108px]">
            <Loader2 className="h-5 w-5 animate-spin text-[#F4A62A]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <StatCard title="Active Jobs" value={String(activeJobs)} icon={Bot} />
      <StatCard title="Failed Jobs 24h" value={String(failedJobs24h)} icon={AlertTriangle} />
      <StatCard title="Recovery Open" value={String(recoveryOpen)} icon={RefreshCcw} />
      <StatCard title="Won Recoveries 30d" value={String(wonRecoveries30d)} icon={Activity} />
      <StatCard title="Open Alerts" value={String(openAlerts)} icon={AlertTriangle} />
      <StatCard title="Last Founder Brief" value={lastFounderBriefLabel} icon={FileText} />
    </div>
  );
}
