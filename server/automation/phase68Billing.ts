// Phase 68A — Billing automation jobs.
// Recommendation-only / maintenance only. Never charges, refunds, or mutates
// Stripe. Stripe remains the money authority; these jobs only keep internal
// AI-credit balances and churn visibility in sync.
import { storage } from "./../storage";

const RESET_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // ~monthly

// Reset each customer's AI credit balance to their plan allotment once their
// monthly window has elapsed. Idempotent — only resets accounts that are due.
export async function runMonthlyCreditReset(): Promise<{ summary: string }> {
  const accounts = await storage.listAiCreditAccounts();
  const now = Date.now();
  let reset = 0;
  for (const acct of accounts) {
    const last = acct.lastResetAt ? acct.lastResetAt.getTime() : 0;
    if (now - last >= RESET_INTERVAL_MS) {
      await storage.setAiCreditAllotment(acct.userId, acct.monthlyAllotment, true);
      reset++;
    }
  }
  return { summary: `accounts=${accounts.length} reset=${reset}` };
}

// Surface subscriptions that are in a churn-risk state (past_due / unpaid).
// Read-only — produces a summary for founder visibility; takes no action.
export async function runChurnFlag(): Promise<{ summary: string }> {
  const atRisk = await storage.listSubscriptionsByStatus(["past_due", "unpaid"]);
  const canceled = await storage.listSubscriptionsByStatus(["canceled"]);
  if (atRisk.length > 0) {
    console.log(`[phase68_churn_flag] ${atRisk.length} subscription(s) at churn risk (past_due/unpaid)`);
  }
  return { summary: `atRisk=${atRisk.length} canceled=${canceled.length}` };
}
