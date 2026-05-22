import { openai } from "./providers";
import { SESSION_SUMMARY_PROMPT } from "./prompts";
import { getAgent } from "./agents";

const SUMMARY_AGENT = getAgent("session_summarizer");

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

  try {
    const response = await openai.chat.completions.create({
      model: SUMMARY_AGENT.model,
      messages: [
        { role: "system", content: SESSION_SUMMARY_PROMPT },
        { role: "user", content: `Lead score: ${currentScore}\nDetected intent so far: ${currentIntent ?? "unknown"}\n\nTranscript:\n${transcript}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: SUMMARY_AGENT.maxTokens,
      temperature: SUMMARY_AGENT.temperature,
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
