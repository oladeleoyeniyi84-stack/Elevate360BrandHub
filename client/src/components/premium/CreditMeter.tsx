// Phase 68A — compact AI credit balance meter.
const GOLD = "#F4A62A";

export function CreditMeter({ balance, allotment }: { balance: number; allotment: number }) {
  const pct = allotment > 0 ? Math.max(0, Math.min(100, Math.round((balance / allotment) * 100))) : 0;
  const low = balance <= Math.max(1, Math.round(allotment * 0.1));
  return (
    <div className="w-full" data-testid="meter-credits">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/60 uppercase tracking-wider">AI Credits</span>
        <span className="font-semibold" style={{ color: low ? "#f87171" : GOLD }} data-testid="text-credit-balance">
          {balance} / {allotment}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: low ? "#f87171" : GOLD }}
        />
      </div>
    </div>
  );
}
