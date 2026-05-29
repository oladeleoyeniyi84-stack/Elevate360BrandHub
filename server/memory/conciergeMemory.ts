// Phase 63 — Concierge memory bridge
//
// Builds returning-visitor context before a reply and persists durable memories
// after a reply. Best-effort: never throws into the chat path.

import { searchMemory, recallForSubject, writeMemory } from "./memoryEngine";

// Build a compact memory context string for the concierge system prompt.
export async function buildConciergeMemoryContext(
  sessionId: string,
  userMessage: string,
): Promise<{ context: string | null; returning: boolean }> {
  try {
    const [recalled, semantic] = await Promise.all([
      recallForSubject("conversation", sessionId, 4),
      searchMemory({ query: userMessage, scope: "conversation", subjectKey: sessionId, limit: 4 }),
    ]);

    const seen = new Set<number>();
    const lines: string[] = [];
    for (const m of [...semantic, ...recalled]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      lines.push(`- ${m.title ? m.title + ": " : ""}${m.content}`);
    }

    if (!lines.length) return { context: null, returning: false };
    const context =
      "What you remember about this returning visitor (use naturally, do not recite verbatim, never claim certainty about identity):\n" +
      lines.slice(0, 6).join("\n");
    return { context, returning: true };
  } catch {
    return { context: null, returning: false };
  }
}

// Persist durable memories from a completed turn (fire-and-forget).
export async function rememberConciergeTurn(args: {
  sessionId: string;
  userMessage: string;
  reply: string;
  intent?: string | null;
  leadEmail?: string | null;
  recommendedOffer?: string | null;
}): Promise<void> {
  const { sessionId, userMessage, reply, intent, leadEmail, recommendedOffer } = args;
  try {
    // Short-term episodic: the exchange itself (expires in 30 days).
    await writeMemory({
      scope: "conversation",
      type: "short_term",
      subjectKey: sessionId,
      title: "Recent exchange",
      content: `Visitor said: "${userMessage}". Concierge replied: "${reply}".`,
      importance: 35,
      source: "concierge",
      ttlMinutes: 60 * 24 * 30,
      dedupe: true,
      metadata: { intent: intent ?? null },
    });

    // Long-term lead signals: durable interests / intent (no PII stored raw).
    if (intent) {
      await writeMemory({
        scope: "lead",
        type: "long_term",
        subjectKey: sessionId,
        title: "Expressed interest",
        content: `Visitor intent: ${intent}.${recommendedOffer ? ` Recommended offer: ${recommendedOffer}.` : ""} Message: "${userMessage}".`,
        importance: leadEmail ? 70 : 55,
        source: "concierge",
        dedupe: true,
        metadata: { intent, recommendedOffer: recommendedOffer ?? null, hasEmail: !!leadEmail },
      });
    }
  } catch {
    /* best-effort */
  }
}
