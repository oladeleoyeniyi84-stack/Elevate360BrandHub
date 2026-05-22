export type TaskType =
  | "concierge"
  | "brand_strategy"
  | "premium_consultation"
  | "emotional_support"
  | "executive_copy"
  | "seo"
  | "social"
  | "content_generation"
  | "automation"
  | "coding"
  | "digest"
  | "followup"
  | "session_summary";

export type ProviderName = "openai" | "deepseek";

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderCallOptions {
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

export interface ProviderResult {
  content: string;
  provider: ProviderName;
  model: string;
  latencyMs: number;
  fallback: boolean;
}

export interface AIProvider {
  name: ProviderName;
  isConfigured(): boolean;
  call(options: ProviderCallOptions): Promise<ProviderResult>;
}
