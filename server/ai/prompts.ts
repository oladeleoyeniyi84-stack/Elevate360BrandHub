import { getConciergePageContext, resolveConciergePagePath } from "@shared/conciergeContext";

export const CONCIERGE_PROMPT = `You are the Elevate360 AI Concierge — a warm, intelligent, premium brand assistant for Elevate360Official. You represent the brand with energy, precision, and authenticity.

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

export const VOICE_PROMPT = `You are the Elevate360 Brand Voice Engine — an expert copywriter who creates compelling, on-brand content for Elevate360Official.

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

export const INTENT_PROMPT = `You are an intent classification engine for the Elevate360Official brand.

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

export const SESSION_SUMMARY_PROMPT = `You are a CRM analyst for Elevate360Official — a brand that sells mobile apps (Bondedlove, Healthwisesupport, Video Crafter), Amazon KDP books, Etsy art, and music.

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

// Sprint 71.1 — context-aware concierge. Only the page PATH comes from the
// client; all knowledge/CTA/link text is looked up server-side in the shared
// config (never trusts client-sent prompt text). Unknown pages contribute just
// a sanitized path line.
export interface ConciergePageSignal {
  page: string;
  sessionMode?: string | null;
}

function sanitizePagePath(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 200);
}

const SESSION_MODE_LABELS: Record<string, string> = {
  default: "general concierge",
  brandStrategy: "brand strategy",
  aiContent: "AI content",
  creativeDirection: "creative direction",
  appProduct: "app / product consultation",
  collaboration: "collaboration / partnership",
  brandAudit: "brand audit",
  founderGrowth: "founder growth",
};

export function buildPageContextBlock(signal: ConciergePageSignal): string {
  const entry = getConciergePageContext(signal.page);
  const lines: string[] = ["\n\n## Current Page Context"];

  if (entry) {
    lines.push(
      `The visitor is currently on the "${entry.pageTitle}" page (${resolveConciergePagePath(signal.page)}) in the ${entry.section} section of the website.`
    );
    if (entry.product) lines.push(`Product in focus: **${entry.product}**.`);
    lines.push(`\n${entry.knowledge}`);
    lines.push(`\nSuggested next step for this page: ${entry.suggestedCta}`);
    if (entry.recommendedLinks.length > 0) {
      lines.push(
        `Relevant links you may share:\n${entry.recommendedLinks.map((l) => `- ${l.label}: ${l.url}`).join("\n")}`
      );
    }
    lines.push(
      "\nUse this context naturally — the visitor should never have to explain where they are or what they're looking at. Do not recite this context back verbatim."
    );
  } else {
    const safePath = sanitizePagePath(signal.page);
    if (safePath) {
      lines.push(`The visitor is currently on the ${safePath} page of the website.`);
    }
  }

  const modeLabel = signal.sessionMode ? SESSION_MODE_LABELS[signal.sessionMode] : undefined;
  if (modeLabel && signal.sessionMode !== "default") {
    lines.push(`Conversation mode selected by the visitor: ${modeLabel}.`);
  }

  return lines.length > 1 ? lines.join("\n") : "";
}

export function buildConciergePromptText(
  knowledgeDocs?: { title: string; category: string; content: string }[],
  consultationTypes?: { title: string; description: string; duration: number; price: number; currency: string }[],
  recommendedOffer?: string | null,
  pageSignal?: ConciergePageSignal | null
): string {
  let prompt = CONCIERGE_PROMPT;

  if (consultationTypes && consultationTypes.length > 0) {
    const formatPrice = (price: number, currency: string) =>
      price === 0 ? "Free" : `$${(price / 100).toFixed(0)} ${currency}`;
    const block = consultationTypes
      .map((c) => `- **${c.title}** (${c.duration} min · ${formatPrice(c.price, c.currency)}): ${c.description}`)
      .join("\n");
    prompt += `\n\n## Consultation & Booking Sessions\nElevate360Official offers the following paid consultation sessions. When a visitor expresses interest in strategy, branding, content, apps, or collaboration — proactively recommend the most relevant session and guide them to book at https://www.elevate360official.com/#book-session.\n\n${block}`;
  }

  if (knowledgeDocs && knowledgeDocs.length > 0) {
    const block = knowledgeDocs
      .map((doc) => `### [${doc.category.toUpperCase()}] ${doc.title}\n${doc.content}`)
      .join("\n\n");
    prompt += `\n\n---\n## Additional Brand Knowledge Base\nUse the following authoritative brand information to answer questions with precision. Prioritize this over general knowledge when relevant.\n\n${block}\n---`;
  }

  if (recommendedOffer) {
    prompt += `\n\n## Recommended Next Step for This Visitor\nBased on signals from this conversation, the AI scoring system recommends nudging toward: **${recommendedOffer}**.\nWhen it feels natural and relevant, guide the conversation toward this offer at https://www.elevate360official.com/#offers or the booking page. Never force it — only mention it when it genuinely fits the visitor's expressed needs.`;
  }

  // Sprint 71.1 — page context is the most volatile block; appended LAST so
  // the large static prompt prefix above stays cacheable by the provider.
  if (pageSignal?.page) {
    prompt += buildPageContextBlock(pageSignal);
  }

  return prompt;
}
