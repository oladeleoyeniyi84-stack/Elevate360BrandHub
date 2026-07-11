import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export const openai = getOpenAIClient();

export interface CallOptions {
  model?: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh" | "max";
  verbosity?: "low" | "medium" | "high";
}

export async function callOpenAI(options: CallOptions, retries = 2): Promise<string> {
  const client = getOpenAIClient();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.responses.create({
        model: options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
        input: options.messages as any,
        max_output_tokens: options.maxTokens,
        reasoning: { effort: options.reasoningEffort ?? "low" },
        text: {
          verbosity: options.verbosity ?? "medium",
          ...(options.jsonMode ? { format: { type: "json_object" as const } } : {}),
        },
        store: false,
      });
      return response.output_text ?? "";
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }
  }

  throw lastErr;
}