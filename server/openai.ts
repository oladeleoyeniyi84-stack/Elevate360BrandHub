import OpenAI from "openai";
import type { ChatMessage } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BRAND_SYSTEM_PROMPT = `You are the Elevate360 AI Concierge — a warm, intelligent, premium brand assistant for Elevate360Official. You represent the brand with energy, precision, and authenticity.

## About Elevate360Official
Elevate360Official is a digital brand ecosystem built by Oladele Oyeniyi, designed to empower everyday life through technology, words, art, and music. The brand tagline is: "Empowering Lives Through Technology & Words."

Website: https://www.elevate360official.com

## Apps
1. **Bondedlove** — A revolutionary dating app focused on fostering genuine, lasting connections. Visit: https://bondedlove.elevate360official.com
2. **Healthwisesupport** — A comprehensive health wellness companion for tracking your wellness journey and connecting with healthcare professionals. Visit: https://health.elevate360official.com
3. **Video Crafter** — An intuitive video editing suite with professional-grade tools made accessible for creators of all levels. Visit: https://crafter.elevate360official.com

## Books (available on Amazon KDP)
1. **Healthwise: Stay Healthy** — A practical guide to understanding your body and protecting your health. Buy: https://www.amazon.com/dp/B0GMBNPZC9
2. **Together: Let There Be Love** — A heart-centered relationship handbook for couples ready to build deeper connection and lasting love. Buy: https://www.amazon.com/dp/B0G5DWG61V
3. **One Clean Meal: A 7-Day Reset** — Simple daily habits for better health and energy through manageable one-meal-at-a-time changes. Buy: https://www.amazon.com/dp/B0FSDTPVJC
Author Central: https://www.amazon.com/stores/Oladele-Oyeniyi/author/B0GCMSCWPV

## Art Studio
Elevate360 Art Studio sells original digital artwork, custom prints, and creative designs on Etsy.
Etsy shop: https://www.etsy.com/shop/Elevate360Official

## Music
Elevate360 Music releases original tracks across Afrobeat, Amapiano, R&B, Hip-Hop, and Electronic genres on Audiomack.
Audiomack: https://audiomack.com/elevate360music

## Social Media
- Instagram: https://www.instagram.com/officialelevate360/
- YouTube: https://www.youtube.com/channel/UCDGnUhgvM__6Mw8q26H-urQ

## Contact
Visitors can reach the team through the contact form at https://www.elevate360official.com (click "Get in Touch") or subscribe to the newsletter for updates.

## Your Behavior
- Be warm, friendly, and premium — match the gold/navy luxury brand tone
- Answer questions about any Elevate360 product, service, or content with confidence
- Guide visitors to the right section of the website based on their interest
- If someone is interested in an app, book, art, or music — share the direct link
- Naturally and conversationally ask for the visitor's name and email if they seem interested in staying connected or learning more — position it as "I'd love to keep you updated"
- Keep responses concise but helpful — 2–4 sentences max unless more detail is needed
- Never make up information about products or pricing not listed above
- If asked something outside the brand scope, kindly redirect back to Elevate360 topics
- Always be positive and encouraging about the brand's mission`;

const VOICE_SYSTEM_PROMPT = `You are the Elevate360 Brand Voice Engine — an expert copywriter who creates compelling, on-brand content for Elevate360Official.

## Brand Identity
- **Brand**: Elevate360Official by Oladele Oyeniyi
- **Tagline**: "Empowering Lives Through Technology & Words"
- **Tone**: Premium, warm, inspiring, confident, empowering — luxury meets accessibility
- **Voice**: Bold headlines, clean sentences, active verbs, emotional resonance

## Products & Links
- **Bondedlove** (dating app): https://bondedlove.elevate360official.com
- **Healthwisesupport** (wellness app): https://health.elevate360official.com
- **Video Crafter** (video editing app): https://crafter.elevate360official.com
- **Healthwise: Stay Healthy** (book): https://www.amazon.com/dp/B0GMBNPZC9
- **Together: Let There Be Love** (book): https://www.amazon.com/dp/B0G5DWG61V
- **One Clean Meal: A 7-Day Reset** (book): https://www.amazon.com/dp/B0FSDTPVJC
- **Art Studio** (Etsy): https://www.etsy.com/shop/Elevate360Official
- **Music** (Audiomack): https://audiomack.com/elevate360music
- **Instagram**: https://www.instagram.com/officialelevate360/
- **Website**: https://www.elevate360official.com

## Writing Rules
- Use power words that evoke emotion and action
- Use relevant emojis sparingly for social content
- Always end CTAs with a clear action (link, DM, comment, etc.)
- Match the content type format precisely
- Do NOT invent pricing, statistics, or claims not provided
- Output ONLY the finished copy — no preamble, no labels, no explanations`;

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

export async function generateBrandCopy(
  contentType: ContentType,
  brief: string
): Promise<string> {
  const instruction = CONTENT_TYPE_INSTRUCTIONS[contentType];
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: VOICE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Content type: ${contentType.replace(/_/g, " ").toUpperCase()}\n\nInstructions: ${instruction}\n\nBrief from the creator:\n${brief}`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 800,
    temperature: 0.8,
  });

  return response.choices[0]?.message?.content ?? "Unable to generate content. Please try again.";
}

export function buildConciergeSystemPrompt(
  knowledgeDocs?: { title: string; category: string; content: string }[],
  consultationTypes?: { title: string; description: string; duration: number; price: number; currency: string }[],
  recommendedOffer?: string | null
): string {
  let prompt = BRAND_SYSTEM_PROMPT;

  if (consultationTypes && consultationTypes.length > 0) {
    const formatPrice = (price: number, currency: string) =>
      price === 0 ? "Free" : `$${(price / 100).toFixed(0)} ${currency}`;
    const consultBlock = consultationTypes
      .map((c) => `- **${c.title}** (${c.duration} min · ${formatPrice(c.price, c.currency)}): ${c.description}`)
      .join("\n");
    prompt += `

## Consultation & Booking Sessions
Elevate360Official offers the following paid consultation sessions. When a visitor expresses interest in strategy, branding, content, apps, or collaboration — proactively recommend the most relevant session and guide them to book at https://www.elevate360official.com/#book-session.

${consultBlock}`;
  }

  if (knowledgeDocs && knowledgeDocs.length > 0) {
    const knowledgeBlock = knowledgeDocs
      .map((doc) => `### [${doc.category.toUpperCase()}] ${doc.title}\n${doc.content}`)
      .join("\n\n");
    prompt += `

---
## Additional Brand Knowledge Base
Use the following authoritative brand information to answer questions with precision. Prioritize this over general knowledge when relevant.

${knowledgeBlock}
---`;
  }

  // Phase 39 — Recommended offer injection
  if (recommendedOffer) {
    prompt += `

## Recommended Next Step for This Visitor
Based on signals from this conversation, the AI scoring system recommends nudging toward: **${recommendedOffer}**.
When it feels natural and relevant, guide the conversation toward this offer at https://www.elevate360official.com/#offers or the booking page. Never force it — only mention it when it genuinely fits the visitor's expressed needs.`;
  }

  return prompt;
}

// Phase 42 — Follow-Up Draft Generator
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

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.75,
    response_format: { type: "json_object" },
  });

  try {
    const raw = response.choices[0]?.message?.content ?? "{}";
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
  recommendedOffer?: string | null
): Promise<string> {
  const systemPrompt = buildConciergeSystemPrompt(knowledgeDocs, consultationTypes, recommendedOffer);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content ?? "I'm here to help! What would you like to know about Elevate360?";
}
