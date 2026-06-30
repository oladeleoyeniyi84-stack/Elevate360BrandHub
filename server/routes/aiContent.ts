// AI content generation route (DeepSeek-backed).
//
// Founder/admin only — every request is PIN-gated via requireDashboardAuth, so
// an unauthenticated call returns 401 JSON (never the SPA HTML fallback),
// provided this router is mounted before serveStatic in registerRoutes.

import { Router } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { requireDashboardAuth, rateLimit } from "../routes";
import { deepseekChat, isDeepseekConfigured, type DeepseekMessage } from "../services/deepseek";
import { ELEVATE360_SYSTEM_PROMPT, OLADELE_FOUNDER_VOICE_PROMPT } from "../config/brandVoice";

// max_tokens budget per content type — keeps generations bounded and cost-aware.
// The request `type` selects the ceiling; longer formats get a larger budget.
const MAX_TOKENS_BY_TYPE = {
  headline: 80,
  social: 400,
  summary: 600,
  email: 1200,
  blog: 2000,
} as const;

type ContentType = keyof typeof MAX_TOKENS_BY_TYPE;

const SYSTEM_PROMPTS: Record<ContentType, string> = {
  headline: "You are an expert copywriter for the Elevate360 brand. Write punchy, high-converting headlines.",
  social: "You are a social media manager for the Elevate360 brand. Write engaging, on-brand social posts.",
  summary: "You are a sharp editor. Summarize the provided material clearly and concisely.",
  email: "You are an email marketing specialist for the Elevate360 brand. Write clear, persuasive emails.",
  blog: "You are a content writer for the Elevate360 brand. Write well-structured, informative blog content.",
};

// Prompt ceiling. The campaign "Generate Everything" flow repurposes the full
// blog post into 11 other assets by prepending the entire blog (which alone can
// approach ~8k chars at the blog max_tokens budget) to each repurpose prompt.
// An 8k cap silently 400'd every repurpose call; 32k comfortably fits a full
// blog source plus the task instruction while staying well within DeepSeek's
// context window.
const MAX_PROMPT_CHARS = 32000;

const requestSchema = z.object({
  type: z.enum(["headline", "social", "summary", "email", "blog"]),
  prompt: z.string().min(1, "prompt is required").max(MAX_PROMPT_CHARS),
  system: z.string().max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  platform: z
    .enum(["instagram", "facebook", "linkedin", "x", "tiktok", "youtube", "podcast", "email", "blog"])
    .optional(),
  useBrandVoice: z.boolean().optional().default(true),
  founderVoice: z.boolean().optional().default(false),
});

export const aiContentRouter = Router();

// Router-level auth: ANY method/path under /api/ai/content requires the
// dashboard PIN, so unauthenticated requests always get 401 JSON.
aiContentRouter.use(requireDashboardAuth);

// Rate limit: 40 requests / 15 min per IP, applied AFTER requireDashboardAuth
// (router-level) so only authenticated callers consume the budget. Sized for the
// campaign "Generate Everything" batch (11 calls/run) so a founder can run it
// and re-run/tweak within the window without tripping the limit. Exceeding it
// returns 429 JSON from the shared rateLimit middleware.
aiContentRouter.post("/", rateLimit(40, 900), async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: fromZodError(parsed.error).message });
  }

  if (!isDeepseekConfigured()) {
    return res.status(503).json({ message: "AI content service is not configured." });
  }

  const { type, prompt, system, temperature, platform, useBrandVoice, founderVoice } = parsed.data;
  const maxTokens = MAX_TOKENS_BY_TYPE[type];

  // Layered system prompt. The per-type SYSTEM_PROMPTS baseline is ALWAYS the
  // foundation; brand voice, founder voice, a platform directive, and any custom
  // instruction are stacked on top (in that order) when present. SYSTEM_PROMPTS
  // is never replaced — brand voice layers on top of the content-type prompt.
  const systemParts: string[] = [SYSTEM_PROMPTS[type]];
  if (useBrandVoice) systemParts.push(ELEVATE360_SYSTEM_PROMPT);
  if (founderVoice) systemParts.push(OLADELE_FOUNDER_VOICE_PROMPT);
  if (platform) {
    systemParts.push(
      `Target platform: ${platform}. Tailor the format, length, and tone to what performs best on ${platform}.`,
    );
  }
  if (system?.trim()) systemParts.push(system.trim());

  const messages: DeepseekMessage[] = [
    { role: "system", content: systemParts.join("\n\n") },
    { role: "user", content: prompt },
  ];

  try {
    const result = await deepseekChat({ messages, maxTokens, temperature });
    return res.json({
      type,
      model: result.model,
      maxTokens,
      latencyMs: result.latencyMs,
      content: result.content,
    });
  } catch (err) {
    // Summary-only log — never leak raw provider errors/keys/prompts.
    const reason = err instanceof Error ? err.message.split("\n")[0] : "unknown";
    console.error("[ai-content] generation failed:", reason);
    return res.status(502).json({ message: "AI content generation failed. Please try again." });
  }
});
