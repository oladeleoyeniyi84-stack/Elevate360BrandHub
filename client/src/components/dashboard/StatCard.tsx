import type { ElementType } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: ElementType;
};

export default function StatCard({ label, value, sub, color = "#F4A62A", icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon style={{ color }} className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[11px] text-white/45 font-medium uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className="text-xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}
