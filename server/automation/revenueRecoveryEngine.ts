import { storage } from "../storage";

function computePriorityScore(input: {
  leadScore?: number | null;
  acceptedOffer?: boolean;
  amountPaid?: number | null;
  hoursSinceCreated?: number;
}) {
  const leadScore = input.leadScore ?? 0;
  const acceptedBonus = input.acceptedOffer ? 20 : 0;
  const amountBucket = input.amountPaid && input.amountPaid > 0 ? 10 : 0;
  const ageBucket = Math.min(20, Math.floor((input.hoursSinceCreated ?? 0) / 6));
  return leadScore + acceptedBonus + amountBucket + ageBucket;
}

export async function runRevenueRecoveryEngine() {
  const [acceptedButUnpaid, abandonedOrders, staleFulfillment] = await Promise.all([
    storage.listAcceptedButUnpaidSessions(),
    storage.listAbandonedCheckoutOrders(1),
    storage.listStaleFulfillmentOrders(24),
  ]);

  let created = 0;

  for (const row of acceptedButUnpaid) {
    await storage.createRevenueRecoveryAction({
      sessionId: row.sessionId,
      orderId: row.orderId ?? null,
      recoveryType: "accepted_not_paid",
      priorityScore: computePriorityScore({
        leadScore: row.leadScore,
        acceptedOffer: true,
      }),
      status: "open",
      targetEmail: row.leadEmail ?? null,
      recommendedAction: "Send high-intent offer recovery follow-up",
      reason: "Lead is hot or warm, follow-up is required, and no paid order is attached.",
    });
    created++;
  }

  for (const order of abandonedOrders) {
    const hoursSinceCreated = Math.max(1, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 3_600_000));
    await storage.createRevenueRecoveryAction({
      sessionId: order.sessionId ?? null,
      orderId: order.id,
      recoveryType: "abandoned_checkout",
      priorityScore: computePriorityScore({ amountPaid: order.amountPaid, hoursSinceCreated }),
      status: "open",
      targetEmail: order.customerEmail ?? null,
      recommendedAction: "Send checkout recovery reminder",
      reason: `Checkout/order exists but is not paid after ${hoursSinceCreated}h.`,
    });
    created++;
  }

  for (const order of staleFulfillment) {
    await storage.createRevenueRecoveryAction({
      sessionId: order.sessionId ?? null,
      orderId: order.id,
      recoveryType: "stale_fulfillment",
      priorityScore: 75,
      status: "open",
      targetEmail: order.customerEmail ?? null,
      recommendedAction: "Escalate fulfillment review",
      reason: `Paid order is still ${order.fulfillmentStatus} beyond SLA.`,
    });
    created++;
  }

  return {
    summary: `created ${created} recovery actions`,
    meta: {
      acceptedButUnpaid: acceptedButUnpaid.length,
      abandonedOrders: abandonedOrders.length,
      staleFulfillment: staleFulfillment.length,
      created,
    },
  };
}
