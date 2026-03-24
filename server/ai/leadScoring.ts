import type { ChatConversation, ChatMessage } from "@shared/schema";
import type { Intent } from "./intentRouter";

export type LeadTemperature = "cold" | "warm" | "hot" | "priority";

export interface LeadScoreResult {
  score: number;
  temperature: LeadTemperature;
  reasoning: string;
  nextAction: string;
  recommendedOffer: string | null;
  recommendedOfferConfidence: number;
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

// Maps intent → recommended Stripe product name and confidence
type OfferMapping = { offer: string; confidence: number };

// Phase 43 — exported so the optimizer route can reference code defaults
export const INTENT_OFFER_MAP_DEFAULT: Partial<Record<string, string>> = {
  art_commission:      "Art Commission Deposit",
  sales_consultation:  "1:1 Creator Session",
  sales_service:       "AI Brand Audit",
  app_interest:        "AI Brand Audit",
  book_interest:       "Premium Content Strategy",
  music_interest:      "Creative Review",
  support_request:     "1:1 Creator Session",
  general_brand:       "AI Brand Audit",
};

const INTENT_OFFER_MAP: Partial<Record<Intent, OfferMapping>> = {
  art_commission:      { offer: "Art Commission Deposit",        confidence: 90 },
  sales_consultation:  { offer: "1:1 Creator Session",           confidence: 85 },
  sales_service:       { offer: "AI Brand Audit",                confidence: 80 },
  app_interest:        { offer: "AI Brand Audit",                confidence: 60 },
  book_interest:       { offer: "Premium Content Strategy",      confidence: 55 },
  music_interest:      { offer: "Creative Review",               confidence: 50 },
  support_request:     { offer: "1:1 Creator Session",           confidence: 40 },
  general_brand:       { offer: "AI Brand Audit",                confidence: 30 },
};

// Phase 43 — DB override cache (refreshed per-scoring call from routes)
let _dbOverrideCache: Record<string, string> = {};
export function setOfferOverrideCache(overrides: Record<string, string>): void {
  _dbOverrideCache = overrides;
}

function resolveRecommendedOffer(
  intent?: Intent,
  allText?: string,
  temperature?: LeadTemperature
): { offer: string | null; confidence: number } {
  // Only recommend offers for warm/hot/priority leads
  if (!temperature || temperature === "cold") return { offer: null, confidence: 0 };

  // Phase 43 — check DB override first
  if (intent && _dbOverrideCache[intent]) {
    const boost = temperature === "priority" ? 10 : temperature === "hot" ? 5 : 0;
    const baseConf = INTENT_OFFER_MAP[intent]?.confidence ?? 50;
    return { offer: _dbOverrideCache[intent], confidence: Math.min(100, baseConf + boost) };
  }

  if (intent && INTENT_OFFER_MAP[intent]) {
    const mapping = INTENT_OFFER_MAP[intent]!;
    // Boost confidence for hot/priority leads
    const boost = temperature === "priority" ? 10 : temperature === "hot" ? 5 : 0;
    return { offer: mapping.offer, confidence: Math.min(100, mapping.confidence + boost) };
  }

  // Text-based fallback
  if (allText) {
    if (allText.includes("art") || allText.includes("commission") || allText.includes("painting")) {
      return { offer: "Art Commission Deposit", confidence: 60 };
    }
    if (allText.includes("book") || allText.includes("content") || allText.includes("writing")) {
      return { offer: "Premium Content Strategy", confidence: 55 };
    }
    if (allText.includes("brand") || allText.includes("audit") || allText.includes("strategy")) {
      return { offer: "AI Brand Audit", confidence: 50 };
    }
  }

  return { offer: null, confidence: 0 };
}

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

  // Resolve recommended offer
  const { offer, confidence } = resolveRecommendedOffer(intent, allText, temperature);

  return {
    score,
    temperature,
    reasoning: reasons.length > 0 ? reasons.join("; ") : "No strong signals detected",
    nextAction: NEXT_ACTIONS[temperature],
    recommendedOffer: offer,
    recommendedOfferConfidence: confidence,
  };
}
