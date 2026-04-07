import { CreatorAvatar } from "./CreatorAvatar";
import { conciergeModes, type ConciergeModeKey } from "@/config/conciergeModes";

type Props = {
  mode: ConciergeModeKey;
  live?: boolean;
  speaking?: boolean;
};

export function ConciergePresenceHeader({ mode, live, speaking }: Props) {
  const config = conciergeModes[mode];

  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5"
      style={{ background: "linear-gradient(135deg, hsl(220 50% 13%), hsl(220 50% 16%))" }}>
      <CreatorAvatar size="md" live={live} speaking={speaking} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="truncate text-sm font-bold text-white font-heading">
            {config.title}
          </h3>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "rgba(244,166,42,0.15)", color: "#F4A62A" }}>
            {config.chip}
          </span>
        </div>
        <p className="text-xs text-white/50 mt-0.5">{config.subtitle}</p>
      </div>
      <div className="ml-auto flex items-center gap-1 flex-shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute h-2 w-2 rounded-full bg-[#F4A62A] opacity-75" />
          <span className="relative h-2 w-2 rounded-full bg-[#F4A62A]" />
        </span>
      </div>
    </div>
  );
}
