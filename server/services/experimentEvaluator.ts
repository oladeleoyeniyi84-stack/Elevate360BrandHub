import { storage } from "../storage";
import { db } from "../db";
import { and, count, eq, gte, avg } from "drizzle-orm";
import { chatConversations, orders, bookings } from "@shared/schema";

export type ExperimentOutcome = {
  changeKey: string;
  status: "won" | "lost" | "inconclusive" | "insufficient_data";
  metrics: {
    leadsAfter: number;
    ordersAfter: number;
    bookingsAfter: number;
    acceptanceRateAfter: number;
  };
  verdict: string;
};

export async function evaluateExperimentOutcome(changeKey: string): Promise<ExperimentOutcome> {
  const change = await storage.getAppliedChangeByKey(changeKey);
  if (!change || !change.appliedAt) {
    return {
      changeKey,
      status: "insufficient_data",
      metrics: { leadsAfter: 0, ordersAfter: 0, bookingsAfter: 0, acceptanceRateAfter: 0 },
      verdict: "No applied-at timestamp — cannot evaluate",
    };
  }

  const since = change.appliedAt;
  const elapsed = Date.now() - since.getTime();
  const minObservationMs = 24 * 60 * 60 * 1000;

  if (elapsed < minObservationMs) {
    return {
      changeKey,
      status: "inconclusive",
      metrics: { leadsAfter: 0, ordersAfter: 0, bookingsAfter: 0, acceptanceRateAfter: 0 },
      verdict: "Observation window too short — check again in 24h",
    };
  }

  const [leadsAfterRow] = await db.select({ c: count() }).from(chatConversations).where(gte(chatConversations.createdAt, since));
  const [ordersAfterRow] = await db.select({ c: count() }).from(orders)
    .where(and(gte(orders.createdAt, since), eq(orders.status, "paid")));
  const [bookingsAfterRow] = await db.select({ c: count() }).from(bookings).where(gte(bookings.createdAt, since));

  const leadsAfter = Number(leadsAfterRow?.c ?? 0);
  const ordersAfter = Number(ordersAfterRow?.c ?? 0);
  const bookingsAfter = Number(bookingsAfterRow?.c ?? 0);

  const acceptedCount = await db.select({ c: count() }).from(chatConversations)
    .where(and(gte(chatConversations.createdAt, since), eq(chatConversations.recommendedOfferAccepted, true)));
  const acceptanceRateAfter = leadsAfter > 0
    ? Math.round((Number(acceptedCount[0]?.c ?? 0) / leadsAfter) * 100)
    : 0;

  const metrics = { leadsAfter, ordersAfter, bookingsAfter, acceptanceRateAfter };

  if (ordersAfter === 0 && leadsAfter < 5) {
    return { changeKey, status: "insufficient_data", metrics, verdict: "Not enough traffic since change applied" };
  }

  const beforeJson = change.beforeJson as any;
  const prevOrders = beforeJson?.ordersBaseline ?? 0;
  const prevLeads = beforeJson?.leadsBaseline ?? 0;

  const orderTrend = prevOrders > 0 ? ((ordersAfter - prevOrders) / prevOrders) * 100 : null;
  const leadTrend = prevLeads > 0 ? ((leadsAfter - prevLeads) / prevLeads) * 100 : null;

  if (orderTrend !== null && orderTrend < -10) {
    return { changeKey, status: "lost", metrics, verdict: `Orders dropped ${Math.abs(orderTrend).toFixed(1)}% after change — recommend rollback` };
  }

  if (orderTrend !== null && orderTrend > 5) {
    return { changeKey, status: "won", metrics, verdict: `Orders improved ${orderTrend.toFixed(1)}% after change — change is effective` };
  }

  return { changeKey, status: "inconclusive", metrics, verdict: "Insufficient delta to declare win or loss — continue observing" };
}
