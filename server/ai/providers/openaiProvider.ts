import { openai } from "../providers";
import type { AIProvider, ProviderCallOptions, ProviderResult } from "../types";

const DEFAULT_MODEL = "gpt-4o";

export const openaiProvider: AIProvider = {
  name: "openai",
  isConfigured: () => !!process.env.OPENAI_API_KEY,
  async call(options: ProviderCallOptions): Promise<ProviderResult> {
    const model = options.model ?? DEFAULT_MODEL;
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });
    return {
      content: response.choices[0]?.message?.content ?? "",
      provider: "openai",
      model,
      latencyMs: Date.now() - start,
      fallback: false,
    };
  },
};
