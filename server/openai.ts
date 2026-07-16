import type OpenAI from "openai";
import type { ChatMessage } from "@shared/schema";
import { openai } from "./ai/providers";
import { VOICE_PROMPT, buildConciergePromptText, type ConciergePageSignal } from "./ai/prompts";
import { getAgent } from "./ai/agents";
import { runTask } from "./ai/modelRouter";

const CONCIERGE_AGENT = getAgent("concierge");
const VOICE_AGENT = getAgent("voice");
const FOLLOWUP_AGENT = getAgent("followup");

export type ContentType =
  | "instagram_caption"
  | "newsletter"
  | "tweet"
  | "youtube_description"
  | "product_description"
  | "book_promo"
  | "music_release"
  | "press_release"
  | "email_subject_lines"
  | "blog_intro";

const PREMIUM_OPENAI_CONTENT_TYPES = new Set<ContentType>(["newsletter"]);

const CONTENT_TYPE_INSTRUCTIONS: Record<ContentType, string> = {
  instagram_caption: "Write an engaging Instagram caption with 3–5 relevant hashtags. Include a clear CTA. Max 200 words.",
  newsletter: "Write a full newsletter email with a subject line, greeting, body (2–3 paragraphs), and sign-off. Keep it warm and personal.",
  tweet: "Write 3 tweet/X post variations (each under 280 characters). Number them 1, 2, 3.",
  youtube_description: "Write a YouTube video description with a hook first line, 2–3 paragraph summary, timestamps placeholder section, and links. SEO-optimized.",
  product_description: "Write a compelling product/app description for a listing page. Include headline, 2–3 benefit bullets, and a CTA. Max 150 words.",
  book_promo: "Write a persuasive book promotional post for social media. Include a hook, key benefit, target reader, and Amazon purchase CTA.",
  music_release: "Write a music release announcement for Instagram/social media. Include the vibe, genre, and Audiomack link CTA.",
  press_release: "Write a concise press release with headline, dateline, 3 paragraphs (news, context, quote), and boilerplate about Elevate360.",
  email_subject_lines: "Generate 10 email subject line variations for this topic. Make them punchy, curiosity-driven, or benefit-focused. Numbered list.",
  blog_intro: "Write an engaging blog post introduction (150–200 words) with a hook, problem statement, and teaser of what the post will cover.",
};

export async function generateBrandCopy(contentType: ContentType, brief: string): Promise<string> {
  const instruction = CONTENT_TYPE_INSTRUCTIONS[contentType];
  const messages = [
    { role: "system" as const, content: VOICE_PROMPT },
    {
      role: "user" as const,
      content: `Content type: ${contentType.replace(/_/g, " ").toUpperCase()}\n\nInstructions: ${instruction}\n\nBrief from the creator:\n${brief}`,
    },
  ];

  const isPremium = PREMIUM_OPENAI_CONTENT_TYPES.has(contentType);
  const task = isPremium ? "executive_copy" : "content_generation";

  const response = await runTask(
    task,
    {
      messages,
      model: VOICE_AGENT.model,
      maxTokens: VOICE_AGENT.maxTokens,
      temperature: VOICE_AGENT.temperature,
      reasoningEffort: VOICE_AGENT.reasoningEffort,
      verbosity: VOICE_AGENT.verbosity,
    },
    isPremium ? { providerOverride: "openai" } : {}
  );

  return response.content || "Unable to generate content. Please try again.";
}

export const buildConciergeSystemPrompt = buildConciergePromptText;

export async function generateFollowupDraft(lead: {
  leadName?: string | null;
  leadEmail?: string | null;
  intent?: string | null;
  sessionSummary?: string | null;
  recommendedOffer?: string | null;
  daysSilent: number;
}): Promise<{ subject: string; body: string }> {
  const prompt = `You are writing a personalised follow-up email on behalf of Oladele Oyeniyi at Elevate360Official.

Lead profile:
- Name: ${lead.leadName ?? "this visitor"}
- Interest: ${lead.intent ? lead.intent.replace(/_/g, " ") : "general enquiry"}
- Summary: ${lead.sessionSummary ?? "No summary available"}
- Days since last contact: ${lead.daysSilent}
- Recommended offer: ${lead.recommendedOffer ?? "none"}

Write a short, warm, personal follow-up email. Rules:
- Subject line: concise, specific to their interest (max 8 words)
- Body: max 3 sentences. Reference their specific interest. If recommendedOffer is set, mention it naturally in one sentence. Close with a clear soft CTA ("reply to this email", "book a free call", etc.)
- Tone: warm, confident, not salesy. Sign off as "Oladele, Elevate360Official"
- Return ONLY a JSON object: { "subject": "...", "body": "..." }`;

  const response = await runTask("followup", {
    messages: [{ role: "user", content: prompt }],
    model: FOLLOWUP_AGENT.model,
    maxTokens: FOLLOWUP_AGENT.maxTokens,
    temperature: FOLLOWUP_AGENT.temperature,
    reasoningEffort: FOLLOWUP_AGENT.reasoningEffort,
    verbosity: FOLLOWUP_AGENT.verbosity,
    jsonMode: true,
  });

  try {
    const raw = response.content || "{}";
    const parsed = JSON.parse(raw);
    return {
      subject: parsed.subject ?? "Following up — Elevate360Official",
      body: parsed.body ?? "Hi, just following up on our recent chat. Let me know if you have any questions!",
    };
  } catch {
    return {
      subject: "Following up — Elevate360Official",
      body: "Hi, just following up on our recent conversation. Would love to connect further — feel free to reply here or book a call. Oladele, Elevate360Official",
    };
  }
}

export async function getConciergeReply(
  history: ChatMessage[],
  userMessage: string,
  knowledgeDocs?: { title: string; category: string; content: string }[],
  consultationTypes?: { title: string; description: string; duration: number; price: number; currency: string }[],
  recommendedOffer?: string | null,
  memoryContext?: string | null,
  pageSignal?: ConciergePageSignal | null
): Promise<string> {
  const systemPrompt = buildConciergePromptText(knowledgeDocs, consultationTypes, recommendedOffer, pageSignal);
  const input: OpenAI.Responses.ResponseInput = [
    ...(memoryContext ? [{ role: "system" as const, content: memoryContext }] : []),
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ] as any;

  const response = await openai.responses.create({
    model: CONCIERGE_AGENT.model,
    instructions: systemPrompt,
    input,
    max_output_tokens: CONCIERGE_AGENT.maxTokens,
    reasoning: { effort: CONCIERGE_AGENT.reasoningEffort },
    text: { verbosity: CONCIERGE_AGENT.verbosity },
    store: false,
  });

  return response.output_text || "I'm here to help! What would you like to know about Elevate360?";
}