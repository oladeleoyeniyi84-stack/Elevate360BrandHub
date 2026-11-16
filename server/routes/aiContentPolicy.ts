// Pure policy/response helpers for AI Content Studio generation.
export const MAX_TOKENS_BY_TYPE = {
  headline: 80,
  social: 400,
  summary: 600,
  email: 1200,
  blog: 6000,
} as const;

export type ContentType = keyof typeof MAX_TOKENS_BY_TYPE;

export interface ContentGenerationResult {
  content: string;
  model: string;
  latencyMs: number;
  finishReason: string | null;
}

export function formatContentGenerationResponse(
  type: ContentType,
  result: ContentGenerationResult,
): { status: number; body: Record<string, unknown> } {
  const maxTokens = MAX_TOKENS_BY_TYPE[type];
  if (result.finishReason === "length") {
    return {
      status: 422,
      body: {
        message: "The AI response reached its output-token limit and may be incomplete. Shorten the prompt or split the article into sections.",
        code: "AI_OUTPUT_TRUNCATED",
        maxTokens,
      },
    };
  }
  if (!result.content.trim()) {
    return {
      status: 502,
      body: { message: "AI content provider returned an empty response.", code: "AI_OUTPUT_EMPTY" },
    };
  }
  return {
    status: 200,
    body: { type, model: result.model, maxTokens, latencyMs: result.latencyMs, finishReason: result.finishReason, content: result.content },
  };
}
