import OpenAI from "openai";
import { storage } from "../storage";
import type { DigestReport } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DigestData {
  weekStart: Date;
  weekEnd: Date;
  totalChats: number;
  hotLeadsCount: number;
  qualifiedCount: number;
  bookedCount: number;
  wonValue: number;
  followupsDue: number;
  unansweredHotLeads: number;
  topIntents: { intent: string; count: number }[];
  topRecommendedOffer: string | null;
  knowledgeBackedChats: number;
  conversionByIntent: Record<string, number>;
  recentLeadSnippets: string[];
}

export async function buildDigestData(): Promise<DigestData> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  const allLeads = await storage.getAllChatConversations();

  const weekLeads = allLeads.filter(
    (l) => l.lastActivityAt && new Date(l.lastActivityAt) >= weekStart
  );

  // Hot leads: score >= 50
  const hotLeadsCount = weekLeads.filter((l) => (l.leadScore ?? 0) >= 50).length;

  // Qualified: pipeline stage qualified/booked/won
  const qualifiedCount = allLeads.filter((l) =>
    ["qualified", "booked", "won", "converted"].includes(l.pipelineStage)
  ).length;

  // Booked this week
  const bookedCount = allLeads.filter(
    (l) =>
      l.pipelineStage === "booked" &&
      l.lastActivityAt &&
      new Date(l.lastActivityAt) >= weekStart
  ).length;

  // Won value total (all time, in cents)
  const wonValue = allLeads.reduce((acc, l) => acc + (l.wonValue ?? 0), 0);

  // Overdue follow-ups
  const followupsDue = allLeads.filter(
    (l) => l.followupDueDate && new Date(l.followupDueDate) < now && !["won", "lost", "converted"].includes(l.pipelineStage)
  ).length;

  // Unanswered hot leads — hot/priority with no session summary (no AI reply analysis yet)
  const unansweredHotLeads = allLeads.filter(
    (l) => (l.leadScore ?? 0) >= 50 && !l.sessionSummary && l.capturedEmail
  ).length;

  // Intent distribution (this week)
  const intentMap = new Map<string, number>();
  for (const l of weekLeads) {
    if (l.intent) {
      intentMap.set(l.intent, (intentMap.get(l.intent) ?? 0) + 1);
    }
  }
  const topIntents = Array.from(intentMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([intent, count]) => ({ intent, count }));

  // Top recommended offer (most common among hot leads)
  const offerMap = new Map<string, number>();
  for (const l of allLeads) {
    if (l.recommendedOffer && (l.leadScore ?? 0) >= 50) {
      offerMap.set(l.recommendedOffer, (offerMap.get(l.recommendedOffer) ?? 0) + 1);
    }
  }
  const topRecommendedOffer = offerMap.size > 0
    ? Array.from(offerMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Knowledge-backed chats: leads with session summary (summarizer ran = knowledge was used)
  const knowledgeBackedChats = allLeads.filter((l) => l.sessionSummary).length;

  // Conversion rate by intent: won / total per intent
  const conversionByIntent: Record<string, number> = {};
  const intentTotals = new Map<string, number>();
  const intentWons = new Map<string, number>();
  for (const l of allLeads) {
    if (!l.intent) continue;
    intentTotals.set(l.intent, (intentTotals.get(l.intent) ?? 0) + 1);
    if (l.pipelineStage === "won" || l.pipelineStage === "converted") {
      intentWons.set(l.intent, (intentWons.get(l.intent) ?? 0) + 1);
    }
  }
  for (const [intent, total] of Array.from(intentTotals.entries())) {
    const wons = intentWons.get(intent) ?? 0;
    conversionByIntent[intent] = total > 0 ? Math.round((wons / total) * 100) : 0;
  }

  // Recent lead snippets for AI context (hot leads' summaries)
  const recentLeadSnippets = allLeads
    .filter((l) => (l.leadScore ?? 0) >= 50 && l.sessionSummary)
    .slice(0, 5)
    .map((l) => `[${l.intent ?? "unknown"}] ${l.sessionSummary}`);

  return {
    weekStart,
    weekEnd,
    totalChats: weekLeads.length,
    hotLeadsCount,
    qualifiedCount,
    bookedCount,
    wonValue,
    followupsDue,
    unansweredHotLeads,
    topIntents,
    topRecommendedOffer,
    knowledgeBackedChats,
    conversionByIntent,
    recentLeadSnippets,
  };
}

export async function generateDigestNarrative(data: DigestData): Promise<string> {
  const wonDollars = (data.wonValue / 100).toFixed(2);

  const prompt = `You are the AI business analyst for Elevate360Official — a brand portfolio by Oladele Oyeniyi featuring mobile apps (Bondedlove, Healthwisesupport, Video Crafter), Amazon KDP books, Etsy art studio, and Audiomack music.

Generate a concise, sharp weekly intelligence digest (200–280 words). Write in second person ("your brand", "you captured"). Use a confident, executive tone. No fluff.

## This Week's Data
- Chat sessions: ${data.totalChats}
- Hot leads (score ≥50): ${data.hotLeadsCount}
- Qualified in pipeline: ${data.qualifiedCount}
- Booked this week: ${data.bookedCount}
- Won revenue (all time): $${wonDollars}
- Overdue follow-ups: ${data.followupsDue}
- Unanswered hot leads: ${data.unansweredHotLeads}
- Knowledge-backed chats: ${data.knowledgeBackedChats}
- Top recommended offer: ${data.topRecommendedOffer ?? "none"}
- Top intents: ${data.topIntents.map((i) => `${i.intent}(${i.count})`).join(", ") || "none"}
- Conversion by intent: ${JSON.stringify(data.conversionByIntent)}
${data.recentLeadSnippets.length > 0 ? `\n## Hot Lead Summaries\n${data.recentLeadSnippets.join("\n")}` : ""}

## Digest Format
1. **Headline** — one sentence capturing the week's story
2. **What's Working** — 2-3 bullets on strong signals
3. **Where to Focus** — 2-3 bullets with specific actions (mention actual follow-up count, overdue leads, top offer)
4. **Content Opportunity** — 1 specific content or product idea based on this week's intents
5. **Your Number to Beat** — one clear metric to improve next week

Keep it tight. Every sentence must be actionable.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return res.choices[0]?.message?.content ?? "Digest generation failed. Please try again.";
}

export async function generateAndSaveDigest(): Promise<DigestReport> {
  const data = await buildDigestData();
  const narrative = await generateDigestNarrative(data);

  return storage.saveDigestReport({
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    narrative,
    topIntents: data.topIntents,
    hotLeadsCount: data.hotLeadsCount,
    qualifiedCount: data.qualifiedCount,
    bookedCount: data.bookedCount,
    wonValue: data.wonValue,
    followupsDue: data.followupsDue,
    unansweredHotLeads: data.unansweredHotLeads,
    topRecommendedOffer: data.topRecommendedOffer,
    knowledgeBackedChats: data.knowledgeBackedChats,
    supportPatterns: null,
    contentOpportunities: null,
    conversionByIntent: data.conversionByIntent,
  });
}
