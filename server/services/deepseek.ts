// Self-contained DeepSeek client for ad-hoc content generation.
//
// Uses the OpenAI-compatible DeepSeek API (chat completions). This is
// intentionally independent of server/ai/* (the model router / providers) so
// the /api/ai/content endpoint has a small, direct surface and no coupling to
// the task-routing system. Env: DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL,
// DEEPSEEK_MODEL.

import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    });
  }
  return _client;
}

export function isDeepseekConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

export interface DeepseekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepseekChatOptions {
  messages: DeepseekMessage[];
  maxTokens: number;
  temperature?: number;
  model?: string;
}

export interface DeepseekChatResult {
  content: string;
  model: string;
  latencyMs: number;
}

export async function deepseekChat(options: DeepseekChatOptions): Promise<DeepseekChatResult> {
  const model = options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const start = Date.now();
  const response = await getClient().chat.completions.create({
    model,
    messages: options.messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature ?? 0.7,
  });
  return {
    content: response.choices[0]?.message?.content ?? "",
    model,
    latencyMs: Date.now() - start,
  };
}
