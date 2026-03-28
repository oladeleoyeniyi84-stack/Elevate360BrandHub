import OpenAI from "openai";
import type { ChatMessage } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type Intent =
  | "sales_service"
  | "sales_consultation"
  | "support"
  | "support_request"
  | "collaboration"
  | "art_commission"
  | "app_interest"
  | "book_interest"
  | "music_interest"
  | "media_press"
  | "newsletter"
  | "general_brand"
  | "unknown";

export interface IntentResult {
  intent: Intent;
  confidence: number;
  routeTarget: string;
  requiresFollowup: boolean;
  capturedEmail?: string;
  capturedName?: string;
}

const ROUTE_TARGETS: Record<Intent, string> = {
  sales_service: "lead_capture_service",
  sales_consultation: "booking_cta",
  support: "support_form",
  collaboration: "contact_collab",
  art_commission: "commission_form",
  app_interest: "app_detail_cta",
  book_interest: "product_detail_buy",
  music_interest: "streaming_cta",
  media_press: "press_contact",
  newsletter: "newsletter_signup",
  support_request: "support_form",
  general_brand: "brand_info",
  unknown: "general",
};

const INTENT_SYSTEM_PROMPT = `You are an intent classification engine for the Elevate360Official brand.

Classify the user's conversation intent into exactly one of:
- sales_service: wants to hire/purchase a digital service
- sales_consultation: wants a strategy call or consultation
- support: has a problem or complaint with an existing product
- collaboration: wants to partner or collaborate with the brand
- art_commission: wants custom artwork or a commission
- app_interest: curious about or wanting to download one of the apps
- book_interest: curious about or wanting to purchase a book
- music_interest: interested in streaming or downloading music
- media_press: journalist, blogger, or press inquiry
- newsletter: wants to join the newsletter or mailing list
- general_brand: general curiosity about the brand
- unknown: intent is unclear

Also:
1. Assign a confidence score 0–100
2. Determine if a human follow-up is needed (requiresFollowup: true if high-value intent or urgency detected)
3. Extract capturedEmail and capturedName if present in the conversation

Return ONLY valid JSON matching this exact shape:
{
  "intent": "<one of the intent values above>",
  "confidence": <0-100>,
  "requiresFollowup": <true|false>,
  "capturedEmail": "<email or null>",
  "capturedName": "<name or null>"
}`;

export async function classifyIntent(
  history: ChatMessage[],
  latestMessage: string
): Promise<IntentResult> {
  try {
    const conversationText = [
      ...history.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${latestMessage}`,
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        { role: "user", content: conversationText },
      ],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const intent: Intent = parsed.intent ?? "unknown";
    const confidence = Math.min(100, Math.max(0, Number(parsed.confidence ?? 0)));

    return {
      intent,
      confidence,
      routeTarget: ROUTE_TARGETS[intent] ?? "general",
      requiresFollowup: !!parsed.requiresFollowup,
      capturedEmail: parsed.capturedEmail || undefined,
      capturedName: parsed.capturedName || undefined,
    };
  } catch {
    return {
      intent: "unknown",
      confidence: 0,
      routeTarget: "general",
      requiresFollowup: false,
    };
  }
}
