import { generateSessionSummary } from "../ai/sessionSummary";
import { storage } from "../storage";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUMMARY_TRIGGER_MESSAGES = 6;
const SUMMARY_REFRESH_MESSAGES = 4;

export async function maybeSummarizeSession(
  sessionId: string,
  messages: ChatMessage[],
  leadScore: number,
  intent: string | null
): Promise<void> {
  const userMessageCount = messages.filter((m) => m.role === "user").length;

  if (userMessageCount < SUMMARY_TRIGGER_MESSAGES) return;

  const existing = await storage.getChatSession(sessionId);
  const hasSummary = !!(existing as any)?.sessionSummary;

  if (hasSummary) {
    const lastTrigger = Math.floor(userMessageCount / SUMMARY_REFRESH_MESSAGES);
    const prevTrigger = Math.floor((userMessageCount - 1) / SUMMARY_REFRESH_MESSAGES);
    if (lastTrigger === prevTrigger) return;
  }

  const result = await generateSessionSummary(messages, leadScore, intent);
  if (!result) return;

  await storage.updateChatSummary(sessionId, {
    sessionSummary: result.sessionSummary,
    leadQuality: result.leadQuality,
    recommendedFollowup: result.recommendedFollowup,
    ctaShown: result.ctaShown,
    conversionOutcome: result.conversionOutcome,
  });
}
