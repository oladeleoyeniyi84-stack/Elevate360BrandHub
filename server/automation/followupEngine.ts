import { storage } from "../storage";
import { generateFollowupDraft } from "../openai";
import { sendLeadFollowupEmail } from "../email";

export const AUTO_FOLLOWUP_DEFAULTS = {
  enabled: "false",
  minScore: "50",
  maxPerDay: "5",
  maxPerLead: "3",
  intervalHours: "6",
};

let lastRunAt: Date | null = null;
let lastRunResult: { sent: number; skipped: number; errors: number } | null = null;
let engineInterval: NodeJS.Timeout | null = null;

export function getEngineStatus() {
  return {
    running: engineInterval !== null,
    lastRunAt: lastRunAt?.toISOString() ?? null,
    lastRunResult,
  };
}

export async function runFollowupCycle(): Promise<{ sent: number; skipped: number; errors: number }> {
  const enabled = (await storage.getAutomationSetting("auto_followup_enabled")) ?? AUTO_FOLLOWUP_DEFAULTS.enabled;
  if (enabled !== "true") {
    lastRunAt = new Date();
    lastRunResult = { sent: 0, skipped: 0, errors: 0 };
    return lastRunResult;
  }

  const minScore = parseInt((await storage.getAutomationSetting("auto_followup_min_score")) ?? AUTO_FOLLOWUP_DEFAULTS.minScore);
  const maxPerDay = parseInt((await storage.getAutomationSetting("auto_followup_max_per_day")) ?? AUTO_FOLLOWUP_DEFAULTS.maxPerDay);
  const maxPerLead = parseInt((await storage.getAutomationSetting("auto_followup_max_per_lead")) ?? AUTO_FOLLOWUP_DEFAULTS.maxPerLead);

  const { overdue, silentHot } = await storage.getReminderQueue();
  const candidates = [...overdue, ...silentHot].filter((l, i, arr) => arr.findIndex((x) => x.sessionId === l.sessionId) === i);

  const eligible = candidates
    .filter((l) => {
      const email = l.leadEmail ?? l.capturedEmail;
      if (!email) return false;
      if ((l.leadScore ?? 0) < minScore) return false;
      if ((l.followupCount ?? 0) >= maxPerLead) return false;
      if (["won", "lost", "closed", "converted"].includes(l.pipelineStage ?? "")) return false;
      return true;
    })
    .slice(0, maxPerDay);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of eligible) {
    const email = lead.leadEmail ?? lead.capturedEmail;
    if (!email) { skipped++; continue; }

    try {
      const lastActivity = lead.lastActivityAt ?? lead.updatedAt;
      const daysSilent = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const draft = await generateFollowupDraft({
        leadName: lead.leadName ?? lead.capturedName,
        leadEmail: email,
        intent: lead.intent,
        sessionSummary: lead.sessionSummary,
        recommendedOffer: lead.recommendedOffer,
        daysSilent,
      });

      await sendLeadFollowupEmail({
        toName: lead.leadName ?? lead.capturedName,
        toEmail: email,
        subject: draft.subject,
        bodyText: draft.body,
      });

      const newDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      await storage.markFollowupSent(lead.sessionId, newDueDate);
      storage.createAuditLog({
        action: "auto_followup_sent",
        resourceType: "lead",
        resourceId: lead.sessionId,
        meta: { toEmail: email, subject: draft.subject, daysSilent },
      }).catch(() => {});

      sent++;
    } catch (e: any) {
      console.error(`[followupEngine] error for session ${lead.sessionId}:`, e.message);
      errors++;
    }
  }

  lastRunAt = new Date();
  lastRunResult = { sent, skipped, errors };
  console.log(`[followupEngine] cycle — sent=${sent} skipped=${skipped} errors=${errors}`);
  return lastRunResult;
}

export async function startFollowupEngine(): Promise<void> {
  if (engineInterval) return;

  const hoursStr = (await storage.getAutomationSetting("auto_followup_interval_hours")) ?? AUTO_FOLLOWUP_DEFAULTS.intervalHours;
  const hours = Math.max(1, parseInt(hoursStr));

  console.log(`[followupEngine] starting — cycle every ${hours}h`);

  engineInterval = setInterval(() => {
    runFollowupCycle().catch((e) => console.error("[followupEngine] cycle error:", e.message));
  }, hours * 60 * 60 * 1000);

  setTimeout(() => {
    runFollowupCycle().catch((e) => console.error("[followupEngine] initial cycle error:", e.message));
  }, 45_000);
}
