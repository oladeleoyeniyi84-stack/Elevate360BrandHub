import { openai } from "../providers";
import type { AIProvider, ProviderCallOptions, ProviderResult } from "../types";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";

export const openaiProvider: AIProvider = {
  name: "openai",
  isConfigured: () => !!process.env.OPENAI_API_KEY,
  async call(options: ProviderCallOptions): Promise<ProviderResult> {
    const model = options.model ?? DEFAULT_MODEL;
    const start = Date.now();

    const response = await openai.responses.create({
      model,
      input: options.messages as any,
      max_output_tokens: options.maxTokens,
      reasoning: {
        effort: options.reasoningEffort ?? "low",
      },
      text: {
        verbosity: options.verbosity ?? "medium",
        ...(options.jsonMode ? { format: { type: "json_object" as const } } : {}),
      },
      store: false,
    });

    return {
      content: response.output_text ?? "",
      provider: "openai",
      model,
      latencyMs: Date.now() - start,
      fallback: false,
    };
  },
};