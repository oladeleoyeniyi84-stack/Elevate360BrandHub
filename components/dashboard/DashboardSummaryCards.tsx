import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, XCircle, Calendar,
  MessageSquare, Flame, CheckCircle2, Trophy,
} from "lucide-react";
import StatCard from "./StatCard";
import type { DashboardSummary } from "@/types/dashboard";

function formatMoney(cents: number) {
  if (cents === 0) return "$0";
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch("/api/dashboard/summary", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

export default function DashboardSummaryCards() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-white/3 h-[72px]" />
        ))}
      </div>
    );
  }

  if (!data) return null;
  const { leads, revenue, engagement } = data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatMoney(revenue.totalPaid)}
          sub={`${revenue.paidOrders} paid order${revenue.paidOrders !== 1 ? "s" : ""}`}
          color="#22c55e"
          icon={DollarSign}
        />
        <StatCard
          label="Avg Order"
          value={formatMoney(revenue.avgOrderValue)}
          sub="per paid order"
          color="#F4A62A"
          icon={TrendingUp}
        />
        <StatCard
          label="Abandoned"
          value={revenue.abandoned}
          sub="initiated · not paid"
          color="#f87171"
          icon={XCircle}
        />
        <StatCard
          label="Pending Bookings"
          value={engagement.pendingBookings}
          sub="awaiting confirmation"
          color="#fb923c"
          icon={Calendar}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Chat Leads"
          value={leads.total}
          sub={`${leads.emailCaptured} with email`}
          color="#6366f1"
          icon={MessageSquare}
        />
        <StatCard
          label="Hot Leads"
          value={leads.hot}
          sub="hot + priority"
          color="#f59e0b"
          icon={Flame}
        />
        <StatCard
          label="Qualified"
          value={leads.qualified}
          sub={`${leads.bookedThisWeek} booked this week`}
          color="#34d399"
          icon={CheckCircle2}
        />
        <StatCard
          label="Won This Month"
          value={leads.wonThisMonth}
          sub={`${engagement.unrepliedContacts} unreplied contacts`}
          color="#c084fc"
          icon={Trophy}
        />
      </div>
    </div>
  );
}
