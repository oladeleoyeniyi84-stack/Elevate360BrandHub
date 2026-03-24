import { storage } from "../storage";
import { classifyIntent } from "../ai/intentRouter";
import { computeLeadScore } from "../ai/leadScoring";
import { maybeSummarizeSession } from "../utils/summarizer";
import type { ChatMessage } from "@shared/schema";

export async function processConversationIntelligence(
  sessionId: string,
  history: ChatMessage[],
  latestMessage: string
): Promise<void> {
  try {
    const intentResult = await classifyIntent(history, latestMessage);
    const conversation = await storage.getChatConversation(sessionId);
    if (!conversation) return;

    const scoreResult = computeLeadScore(
      {
        ...conversation,
        capturedEmail: intentResult.capturedEmail ?? conversation.capturedEmail,
        capturedName: intentResult.capturedName ?? conversation.capturedName,
      },
      intentResult.intent
    );

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
