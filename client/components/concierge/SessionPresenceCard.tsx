import { type ConciergeModeKey, conciergeModes } from "@/config/conciergeModes";
import { CreatorAvatar } from "./CreatorAvatar";

type Props = {
  mode: ConciergeModeKey;
};

export function SessionPresenceCard({ mode }: Props) {
  const config = conciergeModes[mode];

  return (
    <div className="rounded-2xl border border-[#F4A62A]/20 p-4 transition-all duration-300"
      style={{ background: "rgba(17,22,42,0.92)", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
      <div className="flex items-start gap-3">
        <CreatorAvatar size="lg" live />
        <div className="min-w-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide mb-1.5 inline-block"
            style={{ background: "rgba(244,166,42,0.15)", color: "#F4A62A" }}>
            {config.chip}
          </span>
          <h4 className="text-sm font-semibold text-white font-heading">{config.title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-white/60">{config.intro}</p>
        </div>
      </div>
    </div>
  );
}
