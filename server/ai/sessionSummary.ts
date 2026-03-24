import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SessionSummaryResult {
  sessionSummary: string;
  leadQuality: "cold" | "warm" | "hot" | "priority" | "unqualified";
  recommendedFollowup: string;
  ctaShown: string;
  conversionOutcome: string;
  detectedIntent: string;
  userNeeds: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUALITY_MAP: Record<string, SessionSummaryResult["leadQuality"]> = {
  cold: "cold",
  warm: "warm",
  hot: "hot",
  priority: "priority",
  unqualified: "unqualified",
};

export async function generateSessionSummary(
  messages: ChatMessage[],
  currentScore: number,
  currentIntent: string | null
): Promise<SessionSummaryResult | null> {
  if (!messages || messages.length < 4) return null;

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Visitor" : "Concierge"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a CRM analyst for Elevate360Official — a brand that sells mobile apps (Bondedlove, Healthwisesupport, Video Crafter), Amazon KDP books, Etsy art, and music.

Analyze the conversation transcript and return a JSON object with these exact keys:
{
  "sessionSummary": "One-line plain-English summary of the conversation (max 160 chars)",
  "leadQuality": one of: "cold" | "warm" | "hot" | "priority" | "unqualified",
  "detectedIntent": "primary reason the user reached out (max 80 chars)",
  "userNeeds": "what the user actually needs or is trying to accomplish (max 200 chars)",
  "recommendedFollowup": "specific next step the brand owner should take to convert or help this lead (max 200 chars)",
  "ctaShown": "which call-to-action the concierge highlighted, or 'none' if none (max 120 chars)",
  "conversionOutcome": one of: "converted" | "warm_lead" | "cold_lead" | "support_resolved" | "no_action" | "browsing"
}

Lead quality guide:
- priority: Very high intent, ready to buy/commission/book
- hot: Clear interest, specific ask, likely to convert
- warm: Engaged but exploring, needs more nurturing
- cold: Low engagement, vague questions
- unqualified: Wrong audience or spam

Conversion outcome guide:
- converted: User expressed clear purchase/commission intent or clicked a CTA link
- warm_lead: Interested but didn't commit
- cold_lead: Minimal engagement
- support_resolved: Support issue answered
- no_action: Conversation ended without clear outcome
- browsing: Just looking around

Return only valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Lead score: ${currentScore}\nDetected intent so far: ${currentIntent ?? "unknown"}\n\nTranscript:\n${transcript}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return {
      sessionSummary: String(parsed.sessionSummary ?? "").slice(0, 160),
      leadQuality: QUALITY_MAP[parsed.leadQuality] ?? "cold",
      detectedIntent: String(parsed.detectedIntent ?? "").slice(0, 80),
      userNeeds: String(parsed.userNeeds ?? "").slice(0, 200),
      recommendedFollowup: String(parsed.recommendedFollowup ?? "").slice(0, 200),
      ctaShown: String(parsed.ctaShown ?? "none").slice(0, 120),
      conversionOutcome: String(parsed.conversionOutcome ?? "no_action").slice(0, 80),
    };
  } catch (err) {
    console.error("[sessionSummary] OpenAI error:", err);
    return null;
  }
}
