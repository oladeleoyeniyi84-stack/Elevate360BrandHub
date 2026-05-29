import { runTask } from "./modelRouter";
import { VOICE_PROMPT } from "./prompts";
import type { ProviderName } from "./types";
import type { InsertContentDraft } from "@shared/schema";

export type ContentKind = "blog" | "social" | "newsletter";

interface GeneratedDraft {
  title: string;
  excerpt: string;
  body: string;
  category: string;
}

const KIND_INSTRUCTIONS: Record<ContentKind, string> = {
  blog: "Write a complete, publish-ready blog post (500–800 words) with a strong hook, 3–5 sections with subheadings, and a closing CTA. Return JSON with: title (compelling, max 80 chars), excerpt (1–2 sentence summary, max 200 chars), category (one lowercase word), body (markdown).",
  social: "Write an engaging social media post (Instagram/LinkedIn) with a hook, value, and CTA, plus 3–5 relevant hashtags. Return JSON with: title (short label for this post, max 80 chars), excerpt (the hook line, max 200 chars), category (the word 'social'), body (the full post text).",
  newsletter: "Write a warm, personal newsletter email with a subject line, greeting, 2–3 body paragraphs, and a sign-off. Return JSON with: title (the subject line, max 80 chars), excerpt (preview text, max 200 chars), category (the word 'newsletter'), body (the full email).",
};

function safeJsonParse(raw: string): Partial<GeneratedDraft> | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Generate a single on-brand content draft. Bulk content routes to DeepSeek via
 * "content_generation"; premium forces OpenAI via "executive_copy" + providerOverride.
 */
export async function generateContentDraft(
  kind: ContentKind,
  topic: string,
  premium = false
): Promise<InsertContentDraft> {
  const instruction = KIND_INSTRUCTIONS[kind];
  const messages = [
    { role: "system" as const, content: VOICE_PROMPT },
    {
      role: "user" as const,
      content: `Content kind: ${kind.toUpperCase()}\n\nInstructions: ${instruction}\n\nTopic / brief:\n${topic}\n\nReturn ONLY valid JSON.`,
    },
  ];

  const task = premium ? "executive_copy" : "content_generation";
  const response = await runTask(
    task,
    { messages, temperature: 0.8, maxTokens: 2000, jsonMode: true },
    premium ? { providerOverride: "openai" as ProviderName } : {}
  );

  const parsed = safeJsonParse(response.content) ?? {};
  const fallbackTitle = topic.slice(0, 80);

  return {
    kind,
    topic,
    title: (parsed.title || fallbackTitle).slice(0, 300),
    excerpt: (parsed.excerpt || "").slice(0, 1000),
    body: parsed.body || response.content || "",
    category: (parsed.category || kind).toString().slice(0, 60),
    provider: response.provider,
  };
}
