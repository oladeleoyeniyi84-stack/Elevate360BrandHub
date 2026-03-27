import { storage } from "../storage";

export async function runAnomalyEngine() {
  const [staleFulfillment, recoveryActions] = await Promise.all([
    storage.listStaleFulfillmentOrders(24),
    storage.getRevenueRecoveryActions(200),
  ]);

  let alertsCreated = 0;

  if (staleFulfillment.length > 0) {
    await storage.createAutonomousAlert({
      alertKey: `stale-fulfillment-${new Date().toISOString().slice(0, 13)}`,
      area: "revenue",
      severity: staleFulfillment.length >= 5 ? "high" : "medium",
      title: "Stale fulfillment orders detected",
      summary: `${staleFulfillment.length} paid orders remain queued/processing beyond SLA.`,
      suggestedFix: "Review fulfillment queue and escalate blocked orders.",
      autoFixEligible: false,
      status: "open",
      meta: { count: staleFulfillment.length } as any,
    });
    alertsCreated++;
  }

  const openRecovery = recoveryActions.filter((x) => x.status === "open").length;
  if (openRecovery >= 10) {
    await storage.createAutonomousAlert({
      alertKey: `open-recovery-${new Date().toISOString().slice(0, 13)}`,
      area: "followup",
      severity: openRecovery >= 25 ? "high" : "medium",
      title: "Recovery queue backlog growing",
      summary: `${openRecovery} recovery actions are still open.`,
      suggestedFix: "Run recovery automation now or review suppression/contact rules.",
      autoFixEligible: true,
      status: "open",
      meta: { openRecovery } as any,
    });
    alertsCreated++;
  }

  return {
    summary: `created ${alertsCreated} autonomous alerts`,
    meta: { alertsCreated },
  };
}
