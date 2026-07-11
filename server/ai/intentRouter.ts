import type { ChatMessage } from "@shared/schema";
import { openai } from "./providers";
import { INTENT_PROMPT } from "./prompts";
import { getAgent } from "./agents";

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

const INTENT_SYSTEM_PROMPT = INTENT_PROMPT;
const INTENT_AGENT = getAgent("intent_classifier");

export async function classifyIntent(history: ChatMessage[], latestMessage: string): Promise<IntentResult> {
  try {
    const conversationText = [
      ...history.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${latestMessage}`,
    ].join("\n");

    const response = await openai.responses.create({
      model: INTENT_AGENT.model,
      instructions: `${INTENT_SYSTEM_PROMPT}\nReturn only a valid JSON object.`,
      input: conversationText,
      max_output_tokens: INTENT_AGENT.maxTokens,
      reasoning: { effort: INTENT_AGENT.reasoningEffort },
      text: {
        verbosity: INTENT_AGENT.verbosity,
        format: { type: "json_object" },
      },
      store: false,
    });

    const parsed = JSON.parse(response.output_text || "{}");
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