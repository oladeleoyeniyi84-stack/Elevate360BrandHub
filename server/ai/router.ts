import type { ChatMessage } from "@shared/schema";
import { getConciergeReply, generateBrandCopy, generateFollowupDraft, type ContentType } from "../openai";
import type { ConciergePageSignal } from "./prompts";
import { getMemory, setMemory } from "./memory";

export interface ConciergeInput {
  sessionId: string;
  userMessage: string;
  knowledgeDocs?: { title: string; category: string; content: string }[];
  consultationTypes?: {
    title: string;
    description: string;
    duration: number;
    price: number;
    currency: string;
  }[];
  recommendedOffer?: string | null;
  memoryContext?: string | null;
  /** Sprint 71.1 — which page the visitor is on + selected conversation mode. */
  pageSignal?: ConciergePageSignal | null;
}

export interface ConciergeOutput {
  reply: string;
  history: ChatMessage[];
  updatedMessages: ChatMessage[];
}

export async function runConcierge(input: ConciergeInput): Promise<ConciergeOutput> {
  const history = await getMemory(input.sessionId);

  const reply = await getConciergeReply(
    history,
    input.userMessage,
    input.knowledgeDocs,
    input.consultationTypes,
    input.recommendedOffer,
    input.memoryContext,
    input.pageSignal
  );

  const updatedMessages: ChatMessage[] = [
    ...history,
    { role: "user", content: input.userMessage },
    { role: "assistant", content: reply },
  ];

  setMemory(input.sessionId, updatedMessages);

  return { reply, history, updatedMessages };
}

export async function runBrandVoice(
  contentType: ContentType,
  brief: string
): Promise<string> {
  return generateBrandCopy(contentType, brief);
}

export async function runFollowup(
  lead: Parameters<typeof generateFollowupDraft>[0]
): Promise<{ subject: string; body: string }> {
  return generateFollowupDraft(lead);
}
