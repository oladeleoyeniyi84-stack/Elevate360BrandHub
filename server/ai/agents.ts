export interface AgentConfig {
  name: string;
  model: "gpt-4o" | "gpt-4o-mini";
  temperature: number;
  maxTokens: number;
  description: string;
}

export const AGENTS = {
  concierge: {
    name: "concierge",
    model: "gpt-4o" as const,
    temperature: 0.7,
    maxTokens: 400,
    description: "Visitor-facing brand concierge with full knowledge context",
  },
  intent_classifier: {
    name: "intent_classifier",
    model: "gpt-4o-mini" as const,
    temperature: 0.1,
    maxTokens: 200,
    description: "Classifies visitor intent into 13 categories",
  },
  session_summarizer: {
    name: "session_summarizer",
    model: "gpt-4o-mini" as const,
    temperature: 0.2,
    maxTokens: 400,
    description: "Generates CRM session summaries from chat transcripts",
  },
  digest: {
    name: "digest",
    model: "gpt-4o" as const,
    temperature: 0.7,
    maxTokens: 500,
    description: "Generates weekly intelligence digest narratives",
  },
  voice: {
    name: "voice",
    model: "gpt-4o" as const,
    temperature: 0.8,
    maxTokens: 800,
    description: "Brand voice copy generator for 10 content types",
  },
  followup: {
    name: "followup",
    model: "gpt-4o" as const,
    temperature: 0.75,
    maxTokens: 300,
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
