import OpenAI from "openai";
import type { AIProvider, ProviderCallOptions, ProviderResult } from "../types";

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

function getDefaultModel(): string {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

export const deepseekProvider: AIProvider = {
  name: "deepseek",
  isConfigured: () => !!process.env.DEEPSEEK_API_KEY,
  async call(options: ProviderCallOptions): Promise<ProviderResult> {
    const model = options.model ?? getDefaultModel();
    const start = Date.now();
    const response = await getClient().chat.completions.create({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });
    return {
      content: response.choices[0]?.message?.content ?? "",
      provider: "deepseek",
      model,
      latencyMs: Date.now() - start,
      fallback: false,
    };
  },
};
