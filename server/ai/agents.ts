export interface AgentConfig {
  name: string;
  model: "gpt-5.6-sol" | "gpt-5.6-terra" | "gpt-5.6-luna";
  temperature: number;
  maxTokens: number;
  reasoningEffort: "none" | "low" | "medium" | "high";
  verbosity: "low" | "medium" | "high";
  description: string;
}

export const AGENTS = {
  concierge: {
    name: "concierge",
    model: "gpt-5.6-sol" as const,
    temperature: 0.7,
    maxTokens: 500,
    reasoningEffort: "medium" as const,
    verbosity: "medium" as const,
    description: "Visitor-facing brand concierge with full knowledge context",
  },
  intent_classifier: {
    name: "intent_classifier",
    model: "gpt-5.6-luna" as const,
    temperature: 0.1,
    maxTokens: 250,
    reasoningEffort: "low" as const,
    verbosity: "low" as const,
    description: "Classifies visitor intent into 13 categories",
  },
  session_summarizer: {
    name: "session_summarizer",
    model: "gpt-5.6-luna" as const,
    temperature: 0.2,
    maxTokens: 500,
    reasoningEffort: "low" as const,
    verbosity: "low" as const,
    description: "Generates CRM session summaries from chat transcripts",
  },
  digest: {
    name: "digest",
    model: "gpt-5.6-terra" as const,
    temperature: 0.7,
    maxTokens: 700,
    reasoningEffort: "medium" as const,
    verbosity: "medium" as const,
    description: "Generates weekly intelligence digest narratives",
  },
  voice: {
    name: "voice",
    model: "gpt-5.6-terra" as const,
    temperature: 0.8,
    maxTokens: 1000,
    reasoningEffort: "low" as const,
    verbosity: "medium" as const,
    description: "Brand voice copy generator for 10 content types",
  },
  followup: {
    name: "followup",
    model: "gpt-5.6-luna" as const,
    temperature: 0.75,
    maxTokens: 350,
    reasoningEffort: "low" as const,
    verbosity: "low" as const,
    description: "Generates personalised follow-up email drafts for leads",
  },
} satisfies Record<string, AgentConfig>;

export type AgentName = keyof typeof AGENTS;

export function getAgent(name: AgentName): AgentConfig {
  return AGENTS[name];
}

export function listAgents(): AgentConfig[] {
  return Object.values(AGENTS);
}