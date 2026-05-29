// Phase 63 — Cognitive Memory Layer: embeddings
//
// Wraps OpenAI text-embedding-3-small (1536 dims). Degrades gracefully:
// returns null when no API key is configured so memory still stores/recalls
// (recency + importance only) without semantic search.

import { getOpenAIClient } from "../ai/providers";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export function isEmbeddingConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function embedText(text: string): Promise<number[] | null> {
  const input = (text ?? "").trim();
  if (!input || !isEmbeddingConfigured()) return null;
  try {
    const client = getOpenAIClient();
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: input.slice(0, 8000),
    });
    const vec = res.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length === EMBEDDING_DIMENSIONS ? vec : null;
  } catch (err: any) {
    console.error("[memory] embedding failed:", err?.message ?? err);
    return null;
  }
}

// pgvector literal format: '[0.1,0.2,...]'
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
