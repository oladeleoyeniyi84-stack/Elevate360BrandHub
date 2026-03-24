import { storage } from "../storage";
import { classifyIntent } from "../ai/intentRouter";
import { computeLeadScore, setOfferOverrideCache } from "../ai/leadScoring";
import { maybeSummarizeSession } from "../utils/summarizer";
import type { ChatMessage } from "@shared/schema";

// ── Stage-change Automation Rules ─────────────────────────────────────────
// Call this whenever a pipeline stage is changed programmatically.
export async function applyStageAutomation(
  sessionId: string,
  newStage: string,
  wonValue?: number
): Promise<void> {
  try {
    const conv = await storage.getChatConversation(sessionId);
    if (!conv) return;

    const updates: Record<string, unknown> = {};

    // Rule 1 — Qualified: suggest a booking offer (set recommended offer if not already set)
    if (newStage === "qualified" && !conv.recommendedOffer) {
      updates.recommendedOffer = "1:1 Creator Session";
      updates.recommendedOfferConfidence = 80;
    }

    // Rule 2 — Booked: clear overdue follow-up warning
    if (newStage === "booked") {
      updates.followupDueDate = null;
    }

    // Rule 3 — Won: save won value + mark conversion outcome
    if (newStage === "won" && wonValue != null) {
      updates.wonValue = wonValue;
      updates.conversionOutcome = "won";
    }

    // Rule 4 — Art commission intent: prioritize art docs + recommend deposit
    if (
      (conv.intent === "art_commission") &&
      (conv.recommendedOffer == null || conv.recommendedOfferConfidence == null || conv.recommendedOfferConfidence < 85)
    ) {
      updates.recommendedOffer = "Art Commission Deposit";
      updates.recommendedOfferConfidence = 90;
    }

    if (Object.keys(updates).length > 0) {
      await storage.updateChatIntelligence(sessionId, updates as any);
    }
  } catch (err) {
    console.error("[leadService] stage automation failed:", err);
  }
}

// ── Core Intelligence Pipeline ─────────────────────────────────────────────
export async function processConversationIntelligence(
  sessionId: string,
  history: ChatMessage[],
  latestMessage: string
): Promise<void> {
  try {
    const intentResult = await classifyIntent(history, latestMessage);
    const conversation = await storage.getChatConversation(sessionId);
    if (!conversation) return;

    const enrichedConversation = {
      ...conversation,
      capturedEmail: intentResult.capturedEmail ?? conversation.capturedEmail,
      capturedName: intentResult.capturedName ?? conversation.capturedName,
    };

    // Phase 43 — refresh DB offer mapping overrides before scoring
    const overrides = await storage.getOfferMappingOverrides();
    const overrideMap: Record<string, string> = {};
    for (const o of overrides.filter((x) => x.isActive)) overrideMap[o.intent] = o.overrideOffer;
    setOfferOverrideCache(overrideMap);

    const scoreResult = computeLeadScore(enrichedConversation, intentResult.intent);

    // If art_commission intent detected, apply automation
    if (intentResult.intent === "art_commission") {
      applyStageAutomation(sessionId, conversation.pipelineStage).catch(() => {});
    }

    await storage.updateChatIntelligence(sessionId, {
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      routeTarget: intentResult.routeTarget,
      requiresFollowup: intentResult.requiresFollowup,
      capturedEmail: intentResult.capturedEmail,
      capturedName: intentResult.capturedName,
      leadScore: scoreResult.score,
      leadTemperature: scoreResult.temperature,
      scoreReasoning: scoreResult.reasoning,
      nextAction: scoreResult.nextAction,
      recommendedOffer: scoreResult.recommendedOffer ?? undefined,
      recommendedOfferConfidence: scoreResult.recommendedOfferConfidence,
      lastActivityAt: new Date(),
    });

    const allMessages = [...history, { role: "user" as const, content: latestMessage }];
    maybeSummarizeSession(
      sessionId,
      allMessages,
      scoreResult.score,
      intentResult.intent
    ).catch(() => {});
  } catch (err) {
    console.error("[leadService] intelligence processing failed:", err);
  }
}
