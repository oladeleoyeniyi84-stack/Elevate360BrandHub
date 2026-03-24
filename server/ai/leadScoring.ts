import type { ChatConversation, ChatMessage } from "@shared/schema";
import type { Intent } from "./intentRouter";

export type LeadTemperature = "cold" | "warm" | "hot" | "priority";

export interface LeadScoreResult {
  score: number;
  temperature: LeadTemperature;
  reasoning: string;
  nextAction: string;
}

function temperatureFromScore(score: number): LeadTemperature {
  if (score >= 75) return "priority";
  if (score >= 50) return "hot";
  if (score >= 25) return "warm";
  return "cold";
}

const NEXT_ACTIONS: Record<LeadTemperature, string> = {
  priority: "Respond within 1 hour — high conversion potential",
  hot: "Follow up within 24 hours with tailored proposal",
  warm: "Send product info + nurture email sequence",
  cold: "Add to newsletter drip campaign",
};

export function computeLeadScore(
  conversation: ChatConversation,
  intent?: Intent
): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const messages = (conversation.messages as ChatMessage[]) ?? [];
  const allText = messages.map((m) => m.content).join(" ").toLowerCase();

  // Email captured
  if (conversation.capturedEmail || conversation.leadEmail) {
    score += 10;
    reasons.push("+10 email captured");
  }

  // Name captured
  if (conversation.capturedName || conversation.leadName) {
    score += 5;
    reasons.push("+5 name captured");
  }

  // High-value intents
  if (
    intent === "sales_service" ||
    intent === "sales_consultation" ||
    intent === "art_commission"
  ) {
    score += 20;
    reasons.push("+20 service/booking intent");
  }

  // Consultation requested
  if (
    intent === "sales_consultation" ||
    allText.includes("consultation") ||
    allText.includes("book a call") ||
    allText.includes("schedule")
  ) {
    score += 20;
    reasons.push("+20 consultation requested");
  }

  // Urgency language
  const urgencyTerms = ["urgent", "asap", "right away", "immediately", "this week", "today", "soon"];
  if (urgencyTerms.some((t) => allText.includes(t))) {
    score += 15;
    reasons.push("+15 urgency language detected");
  }

  // Budget / premium language
  const budgetTerms = ["budget", "invest", "how much", "pricing", "cost", "premium", "price", "pay", "afford"];
  if (budgetTerms.some((t) => allText.includes(t))) {
    score += 20;
    reasons.push("+20 budget/pricing intent");
  }

  // Repeat visit indicator — more than 4 messages = engaged
  if (messages.length > 4) {
    score += 10;
    reasons.push("+10 high engagement (repeat chat)");
  }

  // Product interest (moderate value)
  if (
    intent === "app_interest" ||
    intent === "book_interest" ||
    intent === "music_interest"
  ) {
    score += 5;
    reasons.push("+5 product interest");
  }

  // General / vague only — cap contribution
  if (intent === "general_brand" || intent === "unknown") {
    score = Math.min(score, 10);
  }

  score = Math.min(100, score);
  const temperature = temperatureFromScore(score);

  return {
    score,
    temperature,
    reasoning: reasons.length > 0 ? reasons.join("; ") : "No strong signals detected",
    nextAction: NEXT_ACTIONS[temperature],
  };
}
