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
  model: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function callOpenAI(options: CallOptions, retries = 2): Promise<string> {
  const client = getOpenAIClient();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: options.model,
        messages: options.messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }
  }
  throw lastErr;
}
