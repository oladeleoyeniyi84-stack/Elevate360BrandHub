import type { Express } from "express";
import { createServer, type Server } from "http";
import { timingSafeEqual, createHmac } from "crypto";
import { storage } from "./storage";
import {
  insertContactMessageSchema,
  insertNewsletterSubscriberSchema,
  chatRequestSchema,
  insertTestimonialSchema,
  insertBlogPostSchema,
  updateBlogPostSchema,
  updateContentDraftSchema,
  generateContentFactorySchema,
  insertAuthorityItemSchema,
  updateAuthorityItemSchema,
  insertMarketplaceProductSchema,
  updateMarketplaceProductSchema,
  marketplaceCheckoutSchema,
  type ChatMessage,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getConciergeReply, generateBrandCopy, type ContentType } from "./openai";
import { runConcierge } from "./ai/router";
import { getMemoryStats } from "./ai/memory";
import { getAIStatus } from "./ai/modelRouter";
import { processConversationIntelligence, applyStageAutomation } from "./services/leadService";
import { resolveRecommendedAction } from "./ai/recommendedAction";
import { buildConciergeMemoryContext, rememberConciergeTurn } from "./memory/conciergeMemory";
import {
  writeMemory,
  searchMemory,
  listMemories,
  deleteMemory,
  pruneExpired,
  getMemoryHealth,
  getMemoryAnalytics,
  type MemoryScope,
  type MemoryType,
} from "./memory/memoryEngine";
import { insertCognitiveMemorySchema } from "@shared/schema";
import { generateContentDraft } from "./ai/contentFactory";
import { generateAndSaveDigest } from "./ai/digestGenerator";
import { notifyNewContact, notifyNewLead, notifyNewSubscriber, sendContactReply, sendDigestEmail, notifyNewBooking } from "./email";
import { generateSitemap } from "./sitemap";
import { z } from "zod";
import { WebhookHandlers } from "./webhookHandlers";
import { getUncachableStripeClient, getStripePublishableKey, isStripeConfigured } from "./stripeClient";
import { getCustomerId } from "./auth/customerAuth";
import { consumeCredits } from "./billing/premiumService";
import { db } from "./db";
import { sql, eq, desc } from "drizzle-orm";
import { auditRuns, auditChecks, auditIssues, insertAuditIssueSchema, updateAuditIssueSchema, updateRevenueRecoveryActionSchema, updateContentOpportunitySchema, updateAutonomousAlertSchema } from "@shared/schema";
import { runAudit } from "./services/auditService";
import { runRevenueRecoveryEngine } from "./automation/revenueRecoveryEngine";
import { runContentOpportunityEngine } from "./automation/contentOpportunityEngine";
import { generateFounderWeeklyBrief, generateMonthlyStrategyBrief } from "./automation/executiveDigestEngine";
import { runAnomalyEngine } from "./automation/anomalyEngine";

const DASHBOARD_PIN = process.env.DASHBOARD_PIN;

// Shared Stripe offer listing — used by the public /api/offers route and by the
// Concierge 2.0 recommendation resolver. Degrades to [] when Stripe is
// unavailable (e.g. dev without keys) so neither path ever throws.
export type StripeOffer = {
  productId: string;
  priceId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
};

async function listStripeOffers(): Promise<StripeOffer[]> {
  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 20 });
    const offers = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
        const price = prices.data[0];
        if (!price) return null;
        return {
          productId: product.id,
          priceId: price.id,
          name: product.name,
          description: product.description ?? "",
          amount: price.unit_amount ?? 0,
          currency: price.currency ?? "usd",
          metadata: (product.metadata ?? {}) as Record<string, string>,
        } as StripeOffer;
      })
    );
    const validOffers = offers.filter((o): o is StripeOffer => o !== null);
    validOffers.sort((a, b) => {
      const ao = parseInt(a.metadata?.displayOrder ?? "999");
      const bo = parseInt(b.metadata?.displayOrder ?? "999");
      return ao - bo || a.name.localeCompare(b.name);
    });
    return validOffers;
  } catch (err) {
    // Summary-only log — never leak raw provider errors/stack to logs or clients.
    const reason = err instanceof Error ? err.message.split("\n")[0] : "unknown";
    console.warn(`[offers] Stripe unavailable, serving empty offer set (${reason})`);
    return [];
  }
}

// Timing-safe PIN comparison. Never logs PIN values or echoes them in errors.
function pinMatches(provided: unknown): boolean {
  if (!DASHBOARD_PIN || typeof provided !== "string" || provided.length === 0) return false;
  // crypto.timingSafeEqual requires equal-length buffers; pad to longest so a
  // length mismatch still runs through the comparison rather than short-circuiting.
  const a = Buffer.from(provided);
  const b = Buffer.from(DASHBOARD_PIN);
  const len = Math.max(a.length, b.length);
  const ap = Buffer.alloc(len);
  const bp = Buffer.alloc(len);
  a.copy(ap);
  b.copy(bp);
  return timingSafeEqual(ap, bp) && a.length === b.length;
}

// Accepts the dashboard PIN from any of:
//   - x-dashboard-pin header
//   - Authorization: Bearer <pin>
//   - body.dashboardPin (POST/PUT JSON only)
// Returns the candidate string (or null), never logged.
function extractDashboardPin(req: any): string | null {
  const hdrPin = req.headers?.["x-dashboard-pin"];
  if (typeof hdrPin === "string" && hdrPin) return hdrPin;
  const auth = req.headers?.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const bodyPin = req.body?.dashboardPin;
  if (typeof bodyPin === "string" && bodyPin) return bodyPin;
  return null;
}

function isDashboardAuthed(req: any): boolean {
  if (req.session?.dashboardAuthed === true) return true;
  const candidate = extractDashboardPin(req);
  return candidate !== null && pinMatches(candidate);
}

export function requireDashboardAuth(req: any, res: any, next: any) {
  if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// ─── IP resolution ────────────────────────────────────────────────────────────
// In production the stack is: Client → Cloudflare → Replit proxy → Express.
// Cloudflare injects CF-Connecting-IP (the real client IP, cannot be spoofed
// by the browser). We prefer that header; fall back to Express req.ip which is
// already hardened by trust proxy: 1 set in index.ts.
function getClientIp(req: any): string {
  const cf = req.headers["cf-connecting-ip"];
  if (cf && typeof cf === "string" && cf.trim()) return cf.trim();
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

// ─── Phase 45: In-memory rate limiter ────────────────────────────────────────
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
function rateLimit(maxReq: number, windowSec: number) {
  return (req: any, res: any, next: any) => {
    const ip = getClientIp(req);
    const key = `${req.path}::${ip}`;
    const now = Date.now();
    const bucket = rateLimitStore[key];
    if (!bucket || now > bucket.resetAt) {
      rateLimitStore[key] = { count: 1, resetAt: now + windowSec * 1000 };
      return next();
    }
    bucket.count++;
    if (bucket.count > maxReq) {
      return res.status(429).json({ message: "Too many requests. Please slow down." });
    }
    next();
  };
}
// Purge stale buckets every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(rateLimitStore)) {
    if (now > rateLimitStore[key].resetAt) delete rateLimitStore[key];
  }
}, 5 * 60 * 1000);

// ─── Bot Guard middleware ─────────────────────────────────────────────────────
// Applied to all public-facing POST endpoints (newsletter, contact, chat).
// Three layers:
//   1. Content-Type must be application/json — blocks raw form POST bots
//   2. User-Agent must be present — blocks the most primitive headless clients
//   3. Honeypot field `website` must be empty — if filled, we silently "succeed"
//      (returning 200 without saving anything) so bots don't know they're blocked
// Every block is console.warn-logged with IP, path, and reason for visibility.
function botGuard(req: any, res: any, next: any) {
  const ip = getClientIp(req);

  // 1. Require application/json Content-Type
  const ct = req.headers["content-type"] ?? "";
  if (!ct.includes("application/json")) {
    console.warn(`[botGuard] BLOCKED ip=${ip} path=${req.path} reason=bad_content_type ct="${ct}"`);
    return res.status(415).json({ message: "Unsupported content type." });
  }
  // 2. Require a User-Agent header
  if (!req.headers["user-agent"]) {
    console.warn(`[botGuard] BLOCKED ip=${ip} path=${req.path} reason=missing_user_agent`);
    return res.status(400).json({ message: "Invalid request." });
  }
  // 3. Honeypot: if the hidden `website` field is filled, pretend success
  if (req.body?.website) {
    console.warn(`[botGuard] HONEYPOT ip=${ip} path=${req.path} website="${String(req.body.website).slice(0, 80)}"`);
    return res.status(200).json({ ok: true });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const { cognitiveOsRouter } = await import("./routes/cognitiveOs");
  app.use("/api/admin/cognitive-os", cognitiveOsRouter);

  // Phase 68A — customer accounts, billing, premium (full /api paths).
  const { customerBillingRouter, handleBillingEvent } = await import("./routes/customerBilling");
  app.use(customerBillingRouter);

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const posts = await storage.getBlogPosts(true);
      res.header("Content-Type", "application/xml");
      res.header("Cache-Control", "public, max-age=3600");
      res.send(generateSitemap(posts.map(p => ({ slug: p.slug, updatedAt: p.updatedAt }))));
    } catch {
      res.header("Content-Type", "application/xml");
      res.send(generateSitemap());
    }
  });

  app.post("/api/contact", rateLimit(5, 60), botGuard, async (req, res) => {
    try {
      const data = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(data);
      res.status(201).json(message);
      notifyNewContact(data.name, data.email, data.message).catch(() => {});
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Failed to send message. Please try again." });
      }
    }
  });

  app.post("/api/newsletter", rateLimit(3, 60), botGuard, async (req, res) => {
    try {
      const data = insertNewsletterSubscriberSchema.parse(req.body);
      const subscriber = await storage.createNewsletterSubscriber(data);
      res.status(201).json(subscriber);
      notifyNewSubscriber(data.email).catch(() => {});
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else if (error?.code === "23505") {
        res.status(409).json({ message: "This email is already subscribed!" });
      } else {
        res.status(500).json({ message: "Failed to subscribe. Please try again." });
      }
    }
  });

  app.post("/api/chat", rateLimit(15, 60), botGuard, async (req, res) => {
    try {
      const { sessionId, message, leadName, leadEmail } = chatRequestSchema.parse(req.body);

      // Phase 68A — AI Concierge is the first live premium gate. Anonymous
      // visitors keep working unchanged; signed-in customers spend AI credits.
      const customerId = getCustomerId(req);
      if (customerId) {
        const remaining = await consumeCredits(customerId, 1);
        if (remaining === null) {
          return res.status(402).json({
            message: "You're out of AI credits. Upgrade your plan for more concierge conversations.",
            code: "insufficient_credits",
          });
        }
      }

      const conversation = await storage.getOrCreateChatSession(sessionId);

      const [knowledgeDocs, activeConsultations, liveOffers] = await Promise.all([
        storage.getPublishedKnowledgeByIntent(null).catch(() => []),
        storage.getConsultations(true).catch(() => []),
        listStripeOffers().catch(() => []),
      ]);

      // Phase 63 — recall returning-visitor memory before generating the reply.
      const { context: memoryContext } = await buildConciergeMemoryContext(sessionId, message);

      // Phase 39 — inject recommended offer for this session into concierge.
      // runConcierge reads history from in-process memory (DB fallback on miss)
      // and updates the cache after generating the reply.
      const { reply, history } = await runConcierge({
        sessionId,
        userMessage: message,
        knowledgeDocs,
        consultationTypes: activeConsultations,
        recommendedOffer: conversation.recommendedOffer,
        memoryContext,
      });

      await storage.appendChatMessage(sessionId, { role: "user", content: message });
      await storage.appendChatMessage(sessionId, { role: "assistant", content: reply });

      if (leadName || leadEmail) {
        await storage.updateChatLead(sessionId, leadName, leadEmail);
        if (leadEmail) {
          notifyNewLead(sessionId, leadName, leadEmail).catch(() => {});
        }
      }

      // Async intelligence: intent classification + lead scoring (non-blocking)
      processConversationIntelligence(sessionId, history, message).catch(() => {});

      // Phase 63 — persist durable memory from this turn (non-blocking)
      rememberConciergeTurn({
        sessionId,
        userMessage: message,
        reply,
        intent: conversation.intent,
        leadEmail: leadEmail ?? conversation.capturedEmail,
        recommendedOffer: conversation.recommendedOffer,
      }).catch(() => {});

      // Concierge 2.0 — surface a concrete, clickable action when the session
      // already has a confident recommendation (set by a prior turn's scoring).
      const recommendedAction = resolveRecommendedAction(
        conversation.recommendedOffer,
        conversation.recommendedOfferConfidence,
        activeConsultations,
        liveOffers,
      );

      res.json({ reply, recommendedAction });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Chat error:", error?.message ?? error);
        res.status(500).json({ message: "The concierge is temporarily unavailable. Please try again." });
      }
    }
  });

  // Dashboard auth
  app.post("/api/dashboard/auth", (req, res) => {
    const { pin } = req.body ?? {};
    if (!DASHBOARD_PIN) {
      return res.status(500).json({ message: "Dashboard PIN not configured." });
    }
    if (pin === DASHBOARD_PIN) {
      (req as any).session.dashboardAuthed = true;
      storage.createAuditLog({ action: "dashboard_login", resourceType: "session", meta: { ip: getClientIp(req) } }).catch(() => {});
      return res.json({ ok: true });
    }
    storage.createAuditLog({ action: "dashboard_login_failed", resourceType: "session", meta: { ip: getClientIp(req) } }).catch(() => {});
    return res.status(401).json({ message: "Invalid PIN." });
  });

  app.post("/api/dashboard/logout", (req, res) => {
    (req as any).session.dashboardAuthed = false;
    res.json({ ok: true });
  });

  // Dashboard data routes (session-protected)
  app.get("/api/dashboard/leads", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const temperature = typeof req.query.temperature === "string" ? req.query.temperature : undefined;
    const leads = await storage.getAllChatConversations(temperature);
    res.json(leads);
  });

  app.patch("/api/dashboard/leads/:sessionId/convert", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    await storage.markLeadConverted(sessionId);
    res.json({ success: true });
  });

  app.get("/api/dashboard/contacts", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const contacts = await storage.getContactMessages();
    res.json(contacts);
  });

  app.post("/api/dashboard/contacts/:id/reply", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid contact ID" });

    const replySchema = z.object({ replyText: z.string().min(1).max(5000) });
    try {
      const { replyText } = replySchema.parse(req.body);
      const contacts = await storage.getContactMessages();
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return res.status(404).json({ message: "Contact not found" });

      await sendContactReply(contact.name, contact.email, replyText);
      const updated = await storage.replyContactMessage(id);
      res.json(updated);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Reply error:", error?.message ?? error);
        res.status(500).json({ message: "Failed to send reply. Please try again." });
      }
    }
  });

  app.get("/api/dashboard/subscribers", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const subscribers = await storage.getNewsletterSubscribers();
    res.json(subscribers);
  });

  const generateSchema = z.object({
    contentType: z.enum([
      "instagram_caption", "newsletter", "tweet", "youtube_description",
      "product_description", "book_promo", "music_release", "press_release",
      "email_subject_lines", "blog_intro",
    ]),
    brief: z.string().min(5).max(1000),
  });

  app.post("/api/dashboard/generate", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { contentType, brief } = generateSchema.parse(req.body);
      const copy = await generateBrandCopy(contentType as ContentType, brief);
      res.json({ copy });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Generate error:", error?.message ?? error);
        res.status(500).json({ message: "Content generation failed. Please try again." });
      }
    }
  });

  app.post("/api/track/visit", async (req, res) => {
    const { page } = req.body ?? {};
    if (!page) return res.status(400).json({ error: "Missing page" });
    await storage.recordPageView(String(page));
    res.json({ ok: true });
  });

  app.get("/api/dashboard/visits", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    const views = await storage.getPageViews();
    res.json(views);
  });

  app.post("/api/track/click", async (req, res) => {
    const { product, label } = req.body ?? {};
    if (!product || !label) return res.status(400).json({ error: "Missing fields" });
    await storage.recordClick(String(product), String(label));
    res.json({ ok: true });
  });

  app.get("/api/dashboard/clicks", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    const stats = await storage.getClickStats();
    res.json(stats);
  });

  app.post("/api/dashboard/digest", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const after7d = (d: Date | null | undefined) => d ? new Date(d) >= sevenDaysAgo : false;

      const [pageViews, chats, contacts, subscribers, clickStats] = await Promise.all([
        storage.getPageViews(),
        storage.getAllChatConversations(),
        storage.getContactMessages(),
        storage.getNewsletterSubscribers(),
        storage.getClickStats(),
      ]);

      const leads = chats.filter((c) => !!c.leadEmail);

      const stats = {
        pageViewsTotal: pageViews.length,
        pageViews7d: pageViews.filter((v) => after7d(v.createdAt)).length,
        chatTotal: chats.length,
        chat7d: chats.filter((c) => after7d(c.createdAt)).length,
        leadsTotal: leads.length,
        leads7d: leads.filter((l) => after7d(l.createdAt)).length,
        contactsTotal: contacts.length,
        contacts7d: contacts.filter((c) => after7d(c.createdAt)).length,
        subscribersTotal: subscribers.length,
        subscribers7d: subscribers.filter((s) => after7d(s.subscribedAt)).length,
        topClicks: [...clickStats].sort((a, b) => b.count - a.count).slice(0, 5),
        generatedAt: now.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" }),
      };

      await sendDigestEmail(stats);
      res.json({ ok: true });
    } catch (err) {
      console.error("Digest error:", err);
      res.status(500).json({ error: "Failed to send digest" });
    }
  });

  app.get("/api/testimonials", async (_req, res) => {
    const items = await storage.getTestimonials(false);
    res.json(items);
  });

  app.get("/api/dashboard/testimonials", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    const items = await storage.getTestimonials(true);
    res.json(items);
  });

  app.post("/api/dashboard/testimonials", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const data = insertTestimonialSchema.parse(req.body);
      const item = await storage.createTestimonial(data);
      res.json(item);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: fromZodError(err).message });
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/dashboard/testimonials/:id/toggle", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    const item = await storage.toggleTestimonialApproval(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.delete("/api/dashboard/testimonials/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    await storage.deleteTestimonial(Number(req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/blog", async (_req, res) => {
    const posts = await storage.getBlogPosts(true);
    res.json(posts);
  });

  app.get("/api/blog/posts", async (_req, res) => {
    const posts = await storage.getBlogPosts(true);
    res.json(posts);
  });

  app.get("/api/blog/:slug", async (req, res) => {
    const post = await storage.getBlogPostBySlug(req.params.slug);
    if (!post || !post.published) return res.status(404).json({ error: "Not found" });
    res.json(post);
  });

  app.get("/api/dashboard/posts", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    const posts = await storage.getBlogPosts(false);
    res.json(posts);
  });

  app.post("/api/dashboard/posts", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const data = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(data);
      res.json(post);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: fromZodError(err).message });
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/dashboard/posts/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const data = updateBlogPostSchema.parse(req.body);
      const post = await storage.updateBlogPost(Number(req.params.id), data);
      if (!post) return res.status(404).json({ error: "Not found" });
      res.json(post);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: fromZodError(err).message });
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/dashboard/posts/:id/publish", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    const post = await storage.toggleBlogPostPublished(Number(req.params.id));
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(post);
  });

  app.delete("/api/dashboard/posts/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ error: "Unauthorized" });
    await storage.deleteBlogPost(Number(req.params.id));
    res.json({ ok: true });
  });

  // Phase 35 — Knowledge Base CRUD
  app.get("/api/dashboard/knowledge", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const docs = await storage.getKnowledgeDocs();
    res.json(docs);
  });

  app.get("/api/knowledge/preview", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const intent = typeof req.query.intent === "string" ? req.query.intent : undefined;
    const docs = await storage.getPublishedKnowledgeByIntent(intent);
    const { buildConciergeSystemPrompt } = await import("./openai");
    const prompt = buildConciergeSystemPrompt(docs);
    res.json({ prompt, docCount: docs.length, docs: docs.map((d) => ({ id: d.id, title: d.title, category: d.category })) });
  });

  app.post("/api/dashboard/knowledge", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { insertKnowledgeDocSchema } = await import("@shared/schema");
      const data = insertKnowledgeDocSchema.parse(req.body);
      const doc = await storage.createKnowledgeDoc(data);
      res.json(doc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/dashboard/knowledge/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    try {
      const { updateKnowledgeDocSchema } = await import("@shared/schema");
      const data = updateKnowledgeDocSchema.parse(req.body);
      const doc = await storage.updateKnowledgeDoc(id, data);
      res.json(doc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/dashboard/knowledge/:id/publish", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const doc = await storage.toggleKnowledgeDocPublished(Number(req.params.id));
    res.json(doc);
  });

  app.delete("/api/dashboard/knowledge/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteKnowledgeDoc(Number(req.params.id));
    res.json({ ok: true });
  });

  // Phase 40 — CRM Pipeline
  app.get("/api/dashboard/pipeline", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const stage = typeof req.query.stage === "string" ? req.query.stage : undefined;
    const leads = await storage.getLeadsByPipelineStage(stage);
    res.json(leads);
  });

  app.patch("/api/dashboard/leads/:sessionId/stage", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { sessionId } = req.params;
    const { stage, note, wonValue, lostReason, followupDueDate } = req.body;
    if (!stage) return res.status(400).json({ message: "stage required" });
    const parsedWonValue = wonValue !== undefined ? Number(wonValue) : undefined;
    await storage.updateLeadPipelineStage(
      sessionId,
      stage,
      note,
      parsedWonValue,
      lostReason,
      followupDueDate ? new Date(followupDueDate) : undefined
    );
    // Phase 39 — automation rules on stage change
    applyStageAutomation(sessionId, stage, parsedWonValue).catch(() => {});
    res.json({ success: true });
  });

  // Phase 36 — Public Consultations
  app.get("/api/consultations", async (_req, res) => {
    const items = await storage.getConsultations(true);
    res.json(items);
  });

  // Phase 36 — Public Booking Submission
  app.post("/api/bookings", async (req, res) => {
    try {
      const { insertBookingSchema } = await import("@shared/schema");
      const data = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(data);

      let consultationTitle: string | undefined;
      if (data.consultationId) {
        const consult = await storage.getConsultation(data.consultationId);
        consultationTitle = consult?.title;
      }

      // Auto-move pipeline stage to "booked" if session exists
      if (data.sessionId) {
        storage.updateLeadPipelineStage(data.sessionId, "booked", "Booked via website").catch(() => {});
      }

      // Send notifications (non-blocking)
      notifyNewBooking({
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        consultationTitle,
        preferredDate: data.preferredDate,
        message: data.message,
      }).catch(() => {});

      res.json({ success: true, id: booking.id });
    } catch (e: any) {
      if (e instanceof ZodError) return res.status(400).json({ message: fromZodError(e).message });
      res.status(500).json({ message: "Booking failed. Please try again." });
    }
  });

  // Phase 36 — Dashboard Bookings
  app.get("/api/dashboard/bookings", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getAllBookings();
    res.json(items);
  });

  app.patch("/api/dashboard/bookings/:id/status", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status required" });
    const item = await storage.updateBookingStatus(Number(req.params.id), status);
    // M03 fix — revert lead pipeline stage when booking is cancelled
    if (status === "cancelled" && item?.sessionId) {
      const lead = await storage.getChatConversation(item.sessionId);
      if (lead && lead.pipelineStage === "booked") {
        storage.updateLeadPipelineStage(item.sessionId, "qualified", "Booking cancelled — reverted to qualified").catch(() => {});
      }
    }
    res.json(item);
  });

  app.delete("/api/dashboard/bookings/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteBooking(Number(req.params.id));
    res.json({ ok: true });
  });

  // Phase 36 — Dashboard Consultation Management
  app.get("/api/dashboard/consultations", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getConsultations();
    res.json(items);
  });

  app.post("/api/dashboard/consultations", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { insertConsultationSchema } = await import("@shared/schema");
      const data = insertConsultationSchema.parse(req.body);
      const item = await storage.createConsultation(data);
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/dashboard/consultations/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { updateConsultationSchema } = await import("@shared/schema");
      const data = updateConsultationSchema.parse(req.body);
      const item = await storage.updateConsultation(Number(req.params.id), data);
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/dashboard/consultations/:id/toggle", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const item = await storage.toggleConsultationActive(Number(req.params.id));
    res.json(item);
  });

  app.delete("/api/dashboard/consultations/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteConsultation(Number(req.params.id));
    res.json({ ok: true });
  });

  // Phase 37 — Stripe Webhook (native signature verification; uses req.rawBody from express.json verify)
  app.post("/api/stripe/webhook", async (req: any, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).json({ error: "Missing stripe-signature" });
    let event;
    try {
      const rawBody = req.rawBody as Buffer;
      event = WebhookHandlers.verifyAndParse(rawBody, Array.isArray(sig) ? sig[0] : sig);
    } catch (e: any) {
      console.error("[stripe] webhook signature verification failed:", e.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session: any = event.data?.object;
        if (session?.id) {
          // Strategy session is a one-time product, NOT a subscription. Log clearly
          // and let the generic order-fulfillment path below mark it paid.
          if (session.metadata?.source === "strategy-session" || session.metadata?.offer === "ai-growth-strategy-session") {
            console.log("[strategy-session] checkout completed", { sessionId: session.id });
          }
          await storage.updateOrderStatus(session.id, "paid", {
            stripePaymentIntentId: session.payment_intent ?? undefined,
            amountPaid: session.amount_total ?? undefined,
            customerName: session.customer_details?.name ?? undefined,
            customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
          });
          // Marketplace digital products are fulfilled immediately on payment.
          if (session.metadata?.marketplaceSlug) {
            storage.setOrderFulfillment(session.id, "delivered").catch(() => {});
          }
          // M02 fix — auto-advance pipeline to "won" + mark offer accepted
          // NOTE: do NOT pass wonValue here; revenue is already tracked via the orders table (M01 fix)
          const sessionChatId = session.metadata?.sessionId;
          if (sessionChatId) {
            const amtLabel = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : "unknown amount";
            storage.updateLeadPipelineStage(
              sessionChatId,
              "won",
              `Paid via Stripe — ${amtLabel}`
              // wonValue intentionally omitted — Stripe order row is the source of truth
            ).catch(() => {});
            const productName = session.metadata?.productName ?? session.line_items?.data?.[0]?.description ?? "stripe-checkout";
            storage.markOfferAccepted(sessionChatId, productName, "stripe").catch(() => {});
          }
        }
      }
      // Phase 68A — dispatch subscription events to the billing handler.
      // Single endpoint / single signing secret handles both one-time orders
      // and subscriptions. handleBillingEvent self-filters by event type and
      // ignores non-subscription checkout sessions, so this is safe to always call.
      await handleBillingEvent(event);
      res.json({ received: true });
    } catch (e: any) {
      console.error("[stripe] webhook fulfillment error:", e.message);
      res.status(500).json({ error: "Webhook fulfillment error" });
    }
  });

  // Phase 37 — Public Stripe key
  app.get("/api/stripe/public-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch {
      res.status(503).json({ publishableKey: null });
    }
  });

  // Phase 37 — Public Offers (fetched directly from Stripe API; native SDK)
  app.get("/api/offers", async (_req, res) => {
    res.json(await listStripeOffers());
  });

  // Phase 37 — Create Stripe Checkout Session
  app.post("/api/checkout/session", async (req, res) => {
    const { priceId, customerEmail, sessionId: chatSessionId, productName, amount } = req.body;
    if (!priceId) return res.status(400).json({ message: "priceId required" });

    // Render-safe origin resolution: prefer explicit canonical config, then Render/Replit
    // platform vars, then localhost as last resort. Strips protocol/trailing slash defensively.
    const rawHost =
      process.env.PUBLIC_BASE_URL ??
      process.env.CANONICAL_HOST ??
      process.env.RENDER_EXTERNAL_HOSTNAME ??
      (process.env.REPLIT_DOMAINS ?? "").split(",")[0] ??
      "localhost:5000";
    const cleanHost = rawHost.replace(/^https?:\/\//, "").replace(/\/$/, "") || "localhost:5000";
    const origin = cleanHost.startsWith("localhost") ? `http://${cleanHost}` : `https://${cleanHost}`;

    try {
      const stripe = await getUncachableStripeClient();

      // Build rich success URL so the thank-you page can display confirmation details
      const successParams = new URLSearchParams({ source: "purchase" });
      if (productName) successParams.set("plan", productName);
      if (amount) successParams.set("amount", String(amount));
      successParams.set("session_id", "{CHECKOUT_SESSION_ID}");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/checkout/success?${successParams.toString()}`,
        cancel_url: `${origin}/#offers`,
        customer_email: customerEmail || undefined,
        metadata: {
          sessionId: chatSessionId ?? "",
          source: "elevate360-website",
        },
      } as any);

      // Determine if this offer was accepted via AI concierge
      let acceptedByAi = false;
      if (chatSessionId) {
        const conv = await storage.getChatSession(chatSessionId).catch(() => undefined);
        acceptedByAi = conv?.recommendedOfferAccepted ?? false;
      }

      // Track as initiated order (abandoned checkout if never completed)
      storage.createOrder({
        stripeSessionId: session.id,
        stripePriceId: priceId,
        productName: productName ?? "Offer",
        customerEmail: customerEmail ?? "unknown",
        status: "initiated",
        fulfillmentStatus: "pending",
        sessionId: chatSessionId ?? undefined,
        metadata: {
          source: "elevate360-website",
          checkoutCreatedAt: new Date().toISOString(),
          acceptedByAi,
        },
      }).catch(() => {});

      res.json({ url: session.url });
    } catch (e: any) {
      console.error("[stripe] checkout error:", e.message);
      // Stripe validation errors (invalid price ID, bad params) are client errors → 400
      if (e?.type === "StripeInvalidRequestError" || e?.statusCode === 400 || e?.statusCode === 404) {
        return res.status(400).json({ message: e.message ?? "Invalid checkout parameters." });
      }
      res.status(500).json({ message: "Could not create checkout session." });
    }
  });

  // Phase 70.3 — AI Growth Strategy Session one-time checkout ($97).
  // Public (no login). Separate from subscription billing. Uses a dedicated
  // env price so it can never collide with Starter/Pro/Elite plans.
  app.post("/api/checkout/strategy-session", async (req, res) => {
    const priceId = process.env.STRIPE_PRICE_STRATEGY_SESSION;
    if (!priceId) {
      return res.status(503).json({ message: "Strategy session checkout is not configured yet." });
    }
    if (!isStripeConfigured()) {
      return res.status(503).json({ message: "Strategy session checkout is not configured yet." });
    }

    const rawHost =
      process.env.PUBLIC_BASE_URL ??
      process.env.CANONICAL_HOST ??
      process.env.RENDER_EXTERNAL_HOSTNAME ??
      (process.env.REPLIT_DOMAINS ?? "").split(",")[0] ??
      "localhost:5000";
    const cleanHost = rawHost.replace(/^https?:\/\//, "").replace(/\/$/, "") || "localhost:5000";
    const origin = cleanHost.startsWith("localhost") ? `http://${cleanHost}` : `https://${cleanHost}`;

    const customerEmail = typeof req.body?.email === "string" && req.body.email.trim() ? req.body.email.trim() : undefined;

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        customer_email: customerEmail,
        success_url: `${origin}/checkout/success?source=strategy-session&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/strategy-session`,
        metadata: {
          source: "strategy-session",
          offer: "ai-growth-strategy-session",
        },
      } as any);

      // Track as an initiated order so the existing webhook marks it paid on completion.
      storage.createOrder({
        stripeSessionId: session.id,
        stripePriceId: priceId,
        productName: "AI Growth Strategy Session",
        customerEmail: customerEmail ?? "unknown",
        status: "initiated",
        fulfillmentStatus: "pending",
        metadata: {
          source: "strategy-session",
          offer: "ai-growth-strategy-session",
          checkoutCreatedAt: new Date().toISOString(),
        },
      }).catch(() => {});

      res.json({ url: session.url });
    } catch (e: any) {
      console.error("[stripe] strategy-session checkout error:", e.message);
      res.status(500).json({ message: "Could not start strategy session checkout." });
    }
  });

  // Phase 37 — Public Order Status Lookup
  // GET /api/orders/status?session_id=<stripe_checkout_session_id>
  // GET /api/orders/status?order_id=<internal_order_id>
  app.get("/api/orders/status", async (req, res) => {
    const { session_id, order_id } = req.query as Record<string, string | undefined>;
    if (!session_id && !order_id) {
      return res.status(400).json({ message: "Provide session_id or order_id as a query parameter." });
    }
    try {
      let order: import("@shared/schema").Order | undefined;
      if (session_id) {
        order = await storage.getOrderByStripeSession(session_id);
      } else if (order_id) {
        const numId = parseInt(order_id, 10);
        if (isNaN(numId)) return res.status(400).json({ message: "order_id must be a number." });
        order = await storage.getOrderById(numId);
      }
      if (!order) return res.status(404).json({ message: "Order not found." });

      const meta = (order.metadata as Record<string, any>) ?? {};
      return res.json({
        id: order.id,
        productName: order.productName,
        customerEmail: order.customerEmail,
        amountPaid: order.amountPaid,
        currency: order.currency,
        paymentStatus: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        stripeSessionId: order.stripeSessionId,
        metadata: {
          acceptedByAi: meta.acceptedByAi ?? false,
          source: meta.source ?? "elevate360-website",
          checkoutCreatedAt: meta.checkoutCreatedAt ?? order.createdAt,
        },
        updatedAt: order.updatedAt,
      });
    } catch (e: any) {
      console.error("[orders/status] error:", e.message);
      return res.status(500).json({ message: "Could not look up order status." });
    }
  });

  // Phase 37 — Dashboard Orders
  app.get("/api/dashboard/orders", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const orders = await storage.getAllOrders();
    const stats = await storage.getOrderStats();
    res.json({ orders, stats });
  });

  // Phase 37 — Dashboard Offers (Stripe products list)
  app.get("/api/dashboard/offers", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 20 });
      const prices = await stripe.prices.list({ active: true, limit: 50 });
      const pricesByProduct = new Map<string, any[]>();
      for (const p of prices.data) {
        const arr = pricesByProduct.get(p.product as string) ?? [];
        arr.push(p);
        pricesByProduct.set(p.product as string, arr);
      }
      const data = products.data.map((prod) => ({
        id: prod.id,
        name: prod.name,
        description: prod.description,
        active: prod.active,
        metadata: prod.metadata,
        prices: pricesByProduct.get(prod.id) ?? [],
      }));
      res.json(data);
    } catch {
      res.json([]);
    }
  });

  // Phase 45 — Health check (public, no auth)
  // ─── Phase 53 — DeepSeek QA Sentinel (admin-only) ──────────────────────────
  app.get("/api/admin/qa-sentinel", requireDashboardAuth, async (_req, res) => {
    try {
      const latest = await storage.getLatestQaSentinelReport();
      const history = await storage.getQaSentinelReports(20);
      res.json({ latest, history });
    } catch (e: any) {
      console.error("[qa-sentinel] fetch failed:", e?.message);
      res.status(500).json({ message: "Could not load QA sentinel reports." });
    }
  });

  app.post("/api/admin/qa-sentinel/run", requireDashboardAuth, async (_req, res) => {
    try {
      const { runQaSentinel } = await import("./ai/qaSentinel");
      const { report, summary } = await runQaSentinel();
      res.json({ ok: true, summary, report });
    } catch (e: any) {
      console.error("[qa-sentinel] run failed:", e?.message);
      res.status(500).json({ ok: false, message: "QA sentinel run failed." });
    }
  });

  // ─── Phase 63 — Cognitive Memory Layer (founder-only) ──────────────────────
  app.get("/api/admin/memory/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const [health, analytics] = await Promise.all([getMemoryHealth(), getMemoryAnalytics()]);
      res.json({ health, analytics });
    } catch (e: any) {
      console.error("[memory] overview failed:", e?.message);
      res.status(500).json({ message: "Could not load memory overview." });
    }
  });

  app.get("/api/admin/memory/search", requireDashboardAuth, async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim();
      if (!q) return res.status(400).json({ message: "Query 'q' is required." });
      const hits = await searchMemory({
        query: q,
        scope: (req.query.scope as MemoryScope) || undefined,
        type: (req.query.type as MemoryType) || undefined,
        subjectKey: (req.query.subjectKey as string) || undefined,
        limit: Math.min(50, Number(req.query.limit) || 12),
      });
      res.json(hits);
    } catch (e: any) {
      console.error("[memory] search failed:", e?.message);
      res.status(500).json({ message: "Memory search failed." });
    }
  });

  app.get("/api/admin/memory/list", requireDashboardAuth, async (req, res) => {
    try {
      const rows = await listMemories({
        scope: (req.query.scope as MemoryScope) || undefined,
        type: (req.query.type as MemoryType) || undefined,
        subjectKey: (req.query.subjectKey as string) || undefined,
        limit: Math.min(200, Number(req.query.limit) || 50),
      });
      res.json(rows);
    } catch (e: any) {
      console.error("[memory] list failed:", e?.message);
      res.status(500).json({ message: "Could not load memories." });
    }
  });

  app.post("/api/admin/memory", requireDashboardAuth, async (req, res) => {
    try {
      const parsed = insertCognitiveMemorySchema.parse(req.body);
      const created = await writeMemory({
        scope: parsed.memoryScope as MemoryScope,
        type: (parsed.memoryType as MemoryType) || "strategic",
        subjectKey: parsed.subjectKey,
        title: parsed.title ?? undefined,
        content: parsed.content,
        importance: parsed.importance ?? 60,
        source: parsed.source || "founder",
        metadata: (parsed.metadata as Record<string, unknown>) ?? {},
      });
      if (!created) return res.status(422).json({ message: "Memory could not be stored (empty after scrub)." });
      res.status(201).json(created);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("[memory] create failed:", error?.message);
        res.status(500).json({ message: "Could not store memory." });
      }
    }
  });

  app.delete("/api/admin/memory/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id." });
      const ok = await deleteMemory(id);
      if (!ok) return res.status(404).json({ message: "Memory not found." });
      res.json({ ok: true });
    } catch (e: any) {
      console.error("[memory] delete failed:", e?.message);
      res.status(500).json({ message: "Could not delete memory." });
    }
  });

  app.post("/api/admin/memory/prune", requireDashboardAuth, async (_req, res) => {
    try {
      const removed = await pruneExpired();
      res.json({ ok: true, removed });
    } catch (e: any) {
      console.error("[memory] prune failed:", e?.message);
      res.status(500).json({ message: "Prune failed." });
    }
  });

  // ─── Phase 64 — Founder Intelligence System (admin-only) ───────────────────
  app.get("/api/admin/founder-intel/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildOverview } = await import("./founder-intel/intelligenceCenter");
      res.json(await buildOverview());
    } catch (e: any) {
      console.error("[founder-intel] overview failed:", e?.message);
      res.status(500).json({ message: "Could not build founder intelligence overview." });
    }
  });

  app.get("/api/admin/founder-intel/forecasts", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildIntelSnapshot } = await import("./founder-intel/aggregator");
      const { computeForecasts } = await import("./founder-intel/forecastEngine");
      const snap = await buildIntelSnapshot();
      res.json({ forecasts: computeForecasts(snap.series), series: snap.series });
    } catch (e: any) {
      console.error("[founder-intel] forecasts failed:", e?.message);
      res.status(500).json({ message: "Could not compute forecasts." });
    }
  });

  app.get("/api/admin/founder-intel/decisions", requireDashboardAuth, async (req, res) => {
    try {
      const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : "open";
      const items = await storage.listFounderDecisionItems({ kind, status });
      res.json(items);
    } catch (e: any) {
      console.error("[founder-intel] decisions failed:", e?.message);
      res.status(500).json({ message: "Could not load decisions." });
    }
  });

  app.post("/api/admin/founder-intel/decisions/generate", requireDashboardAuth, async (_req, res) => {
    try {
      const { generateDecisionCenter } = await import("./founder-intel/decisionEngine");
      const items = await generateDecisionCenter();
      res.json({ ok: true, generated: items.length, items });
    } catch (e: any) {
      console.error("[founder-intel] decision generate failed:", e?.message);
      res.status(500).json({ ok: false, message: "Could not regenerate decision center." });
    }
  });

  app.patch("/api/admin/founder-intel/decisions/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = typeof req.body?.status === "string" ? req.body.status : "";
      if (!Number.isInteger(id) || !["open", "acknowledged", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Invalid id or status." });
      }
      const row = await storage.updateFounderDecisionStatus(id, status);
      if (!row) return res.status(404).json({ message: "Not found." });
      res.json(row);
    } catch (e: any) {
      console.error("[founder-intel] decision update failed:", e?.message);
      res.status(500).json({ message: "Could not update decision." });
    }
  });

  app.get("/api/admin/founder-intel/reports", requireDashboardAuth, async (req, res) => {
    try {
      const period = typeof req.query.period === "string" ? req.query.period : undefined;
      res.json(await storage.listFounderIntelReports(period));
    } catch (e: any) {
      console.error("[founder-intel] reports list failed:", e?.message);
      res.status(500).json({ message: "Could not load reports." });
    }
  });

  app.get("/api/admin/founder-intel/reports/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id." });
      const report = await storage.getFounderIntelReport(id);
      if (!report) return res.status(404).json({ message: "Not found." });
      res.json(report);
    } catch (e: any) {
      console.error("[founder-intel] report fetch failed:", e?.message);
      res.status(500).json({ message: "Could not load report." });
    }
  });

  app.post("/api/admin/founder-intel/reports", requireDashboardAuth, async (req, res) => {
    try {
      const { PERIODS, generateExecutiveReport } = await import("./founder-intel/reportEngine");
      const period = typeof req.body?.period === "string" ? req.body.period : "daily";
      if (!PERIODS.includes(period as any)) {
        return res.status(400).json({ message: "Invalid period. Use daily, weekly, monthly, or quarterly." });
      }
      const report = await generateExecutiveReport(period as any);
      res.status(201).json(report);
    } catch (e: any) {
      console.error("[founder-intel] report generate failed:", e?.message);
      res.status(500).json({ message: "Could not generate report." });
    }
  });

  app.post("/api/admin/founder-intel/copilot", requireDashboardAuth, async (req, res) => {
    try {
      const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
      if (!question) return res.status(400).json({ message: "A question is required." });
      const { askCopilot } = await import("./founder-intel/copilot");
      res.json(await askCopilot(question));
    } catch (e: any) {
      console.error("[founder-intel] copilot failed:", e?.message);
      res.status(500).json({ message: "Copilot could not answer right now." });
    }
  });

  // ─── Phase 65 — Revenue Intelligence Engine (admin-only) ───────────────────
  app.get("/api/admin/revenue-intel/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildRevenueOverview } = await import("./revenue-intel/revenueCenter");
      res.json(await buildRevenueOverview());
    } catch (e: any) {
      console.error("[revenue-intel] overview failed:", e?.message);
      res.status(500).json({ message: "Could not build revenue intelligence overview." });
    }
  });

  app.get("/api/admin/revenue-intel/forecast", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildRevenueSnapshot } = await import("./revenue-intel/aggregator");
      const { computeRevenueForecast } = await import("./revenue-intel/revenueForecast");
      const snap = await buildRevenueSnapshot();
      res.json(computeRevenueForecast(snap.series.map((p) => ({ date: p.date, revenueCents: p.revenueCents }))));
    } catch (e: any) {
      console.error("[revenue-intel] forecast failed:", e?.message);
      res.status(500).json({ message: "Could not compute revenue forecast." });
    }
  });

  app.get("/api/admin/revenue-intel/insights", requireDashboardAuth, async (req, res) => {
    try {
      const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : "open";
      res.json(await storage.listRevenueInsights({ kind, status }));
    } catch (e: any) {
      console.error("[revenue-intel] insights failed:", e?.message);
      res.status(500).json({ message: "Could not load revenue insights." });
    }
  });

  app.post("/api/admin/revenue-intel/insights/generate", requireDashboardAuth, async (_req, res) => {
    try {
      const { generateRevenueInsights } = await import("./revenue-intel/insightEngine");
      const items = await generateRevenueInsights();
      res.json({ ok: true, generated: items.length, items });
    } catch (e: any) {
      console.error("[revenue-intel] insight generate failed:", e?.message);
      res.status(500).json({ ok: false, message: "Could not regenerate revenue insights." });
    }
  });

  app.patch("/api/admin/revenue-intel/insights/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = typeof req.body?.status === "string" ? req.body.status : "";
      if (!Number.isInteger(id) || !["open", "acknowledged", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Invalid id or status." });
      }
      const row = await storage.updateRevenueInsightStatus(id, status);
      if (!row) return res.status(404).json({ message: "Not found." });
      res.json(row);
    } catch (e: any) {
      console.error("[revenue-intel] insight update failed:", e?.message);
      res.status(500).json({ message: "Could not update insight." });
    }
  });

  app.get("/api/admin/revenue-intel/reports", requireDashboardAuth, async (req, res) => {
    try {
      const period = typeof req.query.period === "string" ? req.query.period : undefined;
      res.json(await storage.listRevenueIntelReports(period));
    } catch (e: any) {
      console.error("[revenue-intel] reports list failed:", e?.message);
      res.status(500).json({ message: "Could not load revenue reports." });
    }
  });

  app.get("/api/admin/revenue-intel/reports/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id." });
      const report = await storage.getRevenueIntelReport(id);
      if (!report) return res.status(404).json({ message: "Not found." });
      res.json(report);
    } catch (e: any) {
      console.error("[revenue-intel] report fetch failed:", e?.message);
      res.status(500).json({ message: "Could not load report." });
    }
  });

  app.post("/api/admin/revenue-intel/reports", requireDashboardAuth, async (req, res) => {
    try {
      const { PERIODS, generateRevenueReport } = await import("./revenue-intel/reportEngine");
      const period = typeof req.body?.period === "string" ? req.body.period : "daily";
      if (!PERIODS.includes(period as any)) {
        return res.status(400).json({ message: "Invalid period. Use daily, weekly, monthly, or quarterly." });
      }
      const report = await generateRevenueReport(period as any);
      res.status(201).json(report);
    } catch (e: any) {
      console.error("[revenue-intel] report generate failed:", e?.message);
      res.status(500).json({ message: "Could not generate revenue report." });
    }
  });

  app.post("/api/admin/revenue-intel/copilot", requireDashboardAuth, async (req, res) => {
    try {
      const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
      if (!question) return res.status(400).json({ message: "A question is required." });
      const { askRevenueCopilot } = await import("./revenue-intel/copilot");
      res.json(await askRevenueCopilot(question));
    } catch (e: any) {
      console.error("[revenue-intel] copilot failed:", e?.message);
      res.status(500).json({ message: "Revenue copilot could not answer right now." });
    }
  });

  // ─── Phase 66 — Growth Automation Engine (admin-only, PIN-gated) ───────────
  // Recommendation-only. Campaign launch / social publishing always require
  // explicit founder approval; nothing is executed autonomously.
  app.get("/api/admin/growth-automation/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildGrowthOverview } = await import("./growth-automation/growthCenter");
      res.json(await buildGrowthOverview());
    } catch (e: any) {
      console.error("[growth-automation] overview failed:", e?.message);
      res.status(500).json({ message: "Could not build growth automation overview." });
    }
  });

  app.get("/api/admin/growth-automation/forecast", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildGrowthSnapshot } = await import("./growth-automation/aggregator");
      const { computeConversionForecast } = await import("./growth-automation/conversionForecast");
      const snap = await buildGrowthSnapshot();
      res.json(computeConversionForecast(snap.series.map((p) => ({ date: p.date, visits: p.visits, conversions: p.conversions }))));
    } catch (e: any) {
      console.error("[growth-automation] forecast failed:", e?.message);
      res.status(500).json({ message: "Could not compute conversion forecast." });
    }
  });

  app.get("/api/admin/growth-automation/lead-scoring", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildGrowthSnapshot } = await import("./growth-automation/aggregator");
      const { computeLeadScoring } = await import("./growth-automation/leadScoring");
      res.json(computeLeadScoring(await buildGrowthSnapshot()));
    } catch (e: any) {
      console.error("[growth-automation] lead-scoring failed:", e?.message);
      res.status(500).json({ message: "Could not compute lead scoring." });
    }
  });

  app.get("/api/admin/growth-automation/seo", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildGrowthSnapshot } = await import("./growth-automation/aggregator");
      const { discoverSeoOpportunities } = await import("./growth-automation/seoEngine");
      res.json(discoverSeoOpportunities(await buildGrowthSnapshot()));
    } catch (e: any) {
      console.error("[growth-automation] seo failed:", e?.message);
      res.status(500).json({ message: "Could not analyze SEO opportunities." });
    }
  });

  app.post("/api/admin/growth-automation/content/generate", requireDashboardAuth, async (_req, res) => {
    try {
      const { generateContentOpportunities } = await import("./growth-automation/contentEngine");
      res.json(await generateContentOpportunities());
    } catch (e: any) {
      console.error("[growth-automation] content generate failed:", e?.message);
      res.status(500).json({ message: "Could not generate content ideas." });
    }
  });

  app.get("/api/admin/growth-automation/opportunities", requireDashboardAuth, async (req, res) => {
    try {
      const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : "open";
      res.json(await storage.listGrowthAutoOpportunities({ kind, status }));
    } catch (e: any) {
      console.error("[growth-automation] opportunities failed:", e?.message);
      res.status(500).json({ message: "Could not load growth opportunities." });
    }
  });

  app.post("/api/admin/growth-automation/opportunities/generate", requireDashboardAuth, async (_req, res) => {
    try {
      const { generateGrowthOpportunities } = await import("./growth-automation/opportunityEngine");
      const items = await generateGrowthOpportunities();
      res.json({ ok: true, generated: items.length, items });
    } catch (e: any) {
      console.error("[growth-automation] opportunity generate failed:", e?.message);
      res.status(500).json({ ok: false, message: "Could not regenerate growth opportunities." });
    }
  });

  app.patch("/api/admin/growth-automation/opportunities/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = typeof req.body?.status === "string" ? req.body.status : "";
      if (!Number.isInteger(id) || !["open", "acknowledged", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Invalid id or status." });
      }
      const row = await storage.updateGrowthAutoOpportunityStatus(id, status);
      if (!row) return res.status(404).json({ message: "Not found." });
      res.json(row);
    } catch (e: any) {
      console.error("[growth-automation] opportunity update failed:", e?.message);
      res.status(500).json({ message: "Could not update opportunity." });
    }
  });

  app.get("/api/admin/growth-automation/campaigns", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const channel = typeof req.query.channel === "string" ? req.query.channel : undefined;
      res.json(await storage.listGrowthAutoCampaigns({ status, channel }));
    } catch (e: any) {
      console.error("[growth-automation] campaigns failed:", e?.message);
      res.status(500).json({ message: "Could not load campaigns." });
    }
  });

  app.get("/api/admin/growth-automation/campaigns/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id." });
      const row = await storage.getGrowthAutoCampaign(id);
      if (!row) return res.status(404).json({ message: "Not found." });
      res.json(row);
    } catch (e: any) {
      console.error("[growth-automation] campaign fetch failed:", e?.message);
      res.status(500).json({ message: "Could not load campaign." });
    }
  });

  app.post("/api/admin/growth-automation/campaigns/plan", requireDashboardAuth, async (req, res) => {
    try {
      const { CHANNELS, planCampaign } = await import("./growth-automation/campaignPlanner");
      const objective = typeof req.body?.objective === "string" ? req.body.objective.trim() : "";
      const channel = typeof req.body?.channel === "string" ? req.body.channel : "multi";
      if (!objective) return res.status(400).json({ message: "An objective is required." });
      if (!CHANNELS.includes(channel as any)) return res.status(400).json({ message: "Invalid channel." });
      const campaign = await planCampaign({ objective, channel: channel as any });
      res.status(201).json(campaign);
    } catch (e: any) {
      console.error("[growth-automation] campaign plan failed:", e?.message);
      res.status(500).json({ message: "Could not plan campaign." });
    }
  });

  // Founder approval gate. Authorizes a campaign/social workflow but performs NO
  // autonomous execution — recommendation-only by design.
  app.post("/api/admin/growth-automation/campaigns/:id/approve", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id." });
      const campaign = await storage.getGrowthAutoCampaign(id);
      if (!campaign) return res.status(404).json({ message: "Not found." });
      if (!["draft", "pending_approval"].includes(campaign.status)) {
        return res.status(409).json({ message: `Campaign is '${campaign.status}'; only draft/pending_approval can be approved.` });
      }

      const { evaluateActionSafety } = await import("./orchestrator/governance");
      const capability = campaign.source === "social" ? "publish.outbound" : "activate.campaign";
      const governance = evaluateActionSafety({ agentKey: "growth_agent", capability, payload: { campaignId: id } });
      if (governance.decision === "blocked") {
        return res.status(403).json({ message: governance.reason, governance });
      }

      const actionType = campaign.source === "social" ? "publish_social" : "launch_campaign";

      // Atomic guarded transition first — only one concurrent approve/reject wins.
      const updated = await storage.transitionGrowthAutoCampaign(id, ["draft", "pending_approval"], {
        status: "approved",
        resolvedAt: new Date(),
      });
      if (!updated) {
        const current = await storage.getGrowthAutoCampaign(id);
        return res.status(409).json({ message: `Campaign is '${current?.status ?? "resolved"}'; only draft/pending_approval can be approved.` });
      }

      // Only create the approval record after we won the transition (prevents duplicate approvals on retries/races).
      const approval = await storage.createApprovalRequest({
        requestKey: `growth_campaign_${id}_${Date.now()}`,
        area: "growth",
        actionType,
        payloadJson: { campaignId: id, title: campaign.title, channel: campaign.channel },
        requestedBy: "founder",
        status: "approved",
      });
      const linked = await storage.updateGrowthAutoCampaign(id, { approvalRequestId: approval.id });

      res.json({
        ok: true,
        campaign: linked ?? updated,
        approval,
        governance,
        note: "Approved by founder. Recommendation-only: no autonomous launch/publish is performed by the system.",
      });
    } catch (e: any) {
      console.error("[growth-automation] campaign approve failed:", e?.message);
      res.status(500).json({ message: "Could not approve campaign." });
    }
  });

  app.post("/api/admin/growth-automation/campaigns/:id/reject", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id." });
      const campaign = await storage.getGrowthAutoCampaign(id);
      if (!campaign) return res.status(404).json({ message: "Not found." });
      // Atomic guarded transition — refuse to reject an already-resolved campaign.
      const updated = await storage.transitionGrowthAutoCampaign(id, ["draft", "pending_approval"], { status: "rejected", resolvedAt: new Date() });
      if (!updated) {
        const current = await storage.getGrowthAutoCampaign(id);
        return res.status(409).json({ message: `Campaign is '${current?.status ?? "resolved"}'; only draft/pending_approval can be rejected.` });
      }
      res.json({ ok: true, campaign: updated });
    } catch (e: any) {
      console.error("[growth-automation] campaign reject failed:", e?.message);
      res.status(500).json({ message: "Could not reject campaign." });
    }
  });

  app.post("/api/admin/growth-automation/social/draft", requireDashboardAuth, async (req, res) => {
    try {
      const { draftSocialWorkflow } = await import("./growth-automation/socialEngine");
      const { CHANNELS } = await import("./growth-automation/campaignPlanner");
      const channel = typeof req.body?.channel === "string" ? req.body.channel : "instagram";
      const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
      if (!topic) return res.status(400).json({ message: "A topic is required." });
      if (!CHANNELS.includes(channel as any)) return res.status(400).json({ message: "Invalid channel." });
      const campaign = await draftSocialWorkflow({ channel: channel as any, topic });
      res.status(201).json(campaign);
    } catch (e: any) {
      console.error("[growth-automation] social draft failed:", e?.message);
      res.status(500).json({ message: "Could not draft social workflow." });
    }
  });

  app.get("/api/admin/growth-automation/reports", requireDashboardAuth, async (req, res) => {
    try {
      const period = typeof req.query.period === "string" ? req.query.period : undefined;
      res.json(await storage.listGrowthAutoReports(period));
    } catch (e: any) {
      console.error("[growth-automation] reports list failed:", e?.message);
      res.status(500).json({ message: "Could not load growth reports." });
    }
  });

  app.get("/api/admin/growth-automation/reports/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id." });
      const report = await storage.getGrowthAutoReport(id);
      if (!report) return res.status(404).json({ message: "Not found." });
      res.json(report);
    } catch (e: any) {
      console.error("[growth-automation] report fetch failed:", e?.message);
      res.status(500).json({ message: "Could not load report." });
    }
  });

  app.post("/api/admin/growth-automation/reports", requireDashboardAuth, async (req, res) => {
    try {
      const { PERIODS, generateGrowthReport } = await import("./growth-automation/reportEngine");
      const period = typeof req.body?.period === "string" ? req.body.period : "daily";
      if (!PERIODS.includes(period as any)) {
        return res.status(400).json({ message: "Invalid period. Use daily, weekly, monthly, or quarterly." });
      }
      const report = await generateGrowthReport(period as any);
      res.status(201).json(report);
    } catch (e: any) {
      console.error("[growth-automation] report generate failed:", e?.message);
      res.status(500).json({ message: "Could not generate growth report." });
    }
  });

  app.post("/api/admin/growth-automation/copilot", requireDashboardAuth, async (req, res) => {
    try {
      const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
      if (!question) return res.status(400).json({ message: "A question is required." });
      const { askGrowthCopilot } = await import("./growth-automation/copilot");
      res.json(await askGrowthCopilot(question));
    } catch (e: any) {
      console.error("[growth-automation] copilot failed:", e?.message);
      res.status(500).json({ message: "Growth copilot could not answer right now." });
    }
  });

  // ─── Phase 54 — Autonomous Recovery Engine (admin-only) ────────────────────
  app.get("/api/admin/recovery", requireDashboardAuth, async (_req, res) => {
    try {
      const latest = await storage.getLatestRecoveryReport();
      const history = await storage.getRecoveryReports(20);
      res.json({ latest, history });
    } catch (e: any) {
      console.error("[recovery] fetch failed:", e?.message);
      res.status(500).json({ message: "Could not load recovery reports." });
    }
  });

  app.post("/api/admin/recovery/run", requireDashboardAuth, async (_req, res) => {
    try {
      const { runRecoveryEngine } = await import("./automation/recoveryEngine");
      const { report, summary } = await runRecoveryEngine();
      res.json({ ok: true, summary, report });
    } catch (e: any) {
      console.error("[recovery] run failed:", e?.message);
      res.status(500).json({ ok: false, message: "Recovery engine run failed." });
    }
  });

  // ─── Phase 55 — Founder AI Operations Center (admin-only) ──────────────────
  app.get("/api/admin/ops/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildOpsOverview } = await import("./telemetry/operationsCenter");
      const overview = await buildOpsOverview();
      res.json(overview);
    } catch (e: any) {
      console.error("[ops] overview failed:", e?.message);
      res.status(500).json({ message: "Could not build operations overview." });
    }
  });

  app.get("/api/admin/ops/timeseries", requireDashboardAuth, async (req, res) => {
    try {
      const hours = Math.min(Math.max(parseInt(String(req.query.hours ?? "24"), 10) || 24, 1), 168);
      const { buildJobTimeseries } = await import("./telemetry/operationsCenter");
      const series = await buildJobTimeseries(hours);
      res.json({ hours, series });
    } catch (e: any) {
      console.error("[ops] timeseries failed:", e?.message);
      res.status(500).json({ message: "Could not build timeseries." });
    }
  });

  // ─── Unified Executive Command Center (read-only cockpit) ──────────────────
  // Rolls up cross-system KPIs from existing storage + AI status. Purely
  // aggregative: makes no Phase 49–62 changes and mutates nothing.
  app.get("/api/admin/executive/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const [
        summary,
        attribution,
        funnel,
        urgency,
        health,
        blogPosts,
        offers,
      ] = await Promise.all([
        storage.getDashboardSummary().catch(() => null),
        storage.getRevenueAttributionData().catch(() => null),
        storage.getConversionFunnel().catch(() => null),
        storage.getUrgencyDashboard().catch(() => null),
        storage.getSystemHealthSummary().catch(() => null),
        storage.getBlogPosts(false).catch(() => [] as any[]),
        listStripeOffers().catch(() => [] as StripeOffer[]),
      ]);

      const ai = getAIStatus();
      const memory = getMemoryStats();

      const publishedPosts = (blogPosts ?? []).filter((p: any) => p.published || p.isPublished || p.status === "published");

      res.json({
        generatedAt: new Date().toISOString(),
        revenue: {
          totalPaidCents: summary?.revenue?.totalPaid ?? 0,
          paidOrders: summary?.revenue?.paidOrders ?? 0,
          avgOrderValueCents: summary?.revenue?.avgOrderValue ?? 0,
          abandoned: summary?.revenue?.abandoned ?? 0,
          combinedRevenueCents: attribution?.totals?.combinedRevenue ?? 0,
          wonRevenueCents: attribution?.totals?.wonRevenue ?? 0,
          wonDeals: attribution?.totals?.wonDeals ?? 0,
          monthlySeries: attribution?.monthlySeries ?? [],
          byOffer: attribution?.byOffer ?? [],
        },
        pipeline: {
          totalLeads: summary?.leads?.total ?? 0,
          emailCaptured: summary?.leads?.emailCaptured ?? 0,
          hot: summary?.leads?.hot ?? 0,
          qualified: summary?.leads?.qualified ?? 0,
          bookedThisWeek: summary?.leads?.bookedThisWeek ?? 0,
          wonThisMonth: summary?.leads?.wonThisMonth ?? 0,
          topIntent: summary?.topIntent ?? null,
          topRecommendedOffer: summary?.topRecommendedOffer ?? null,
          funnel: funnel?.stages ?? [],
        },
        urgency: {
          overdueHotLeads: urgency?.overdueHotLeads ?? 0,
          newQualifiedLeads: urgency?.newQualifiedLeads ?? 0,
          pendingBookings: urgency?.pendingBookings ?? 0,
          paidOrdersToday: urgency?.paidOrdersToday ?? 0,
          unrepliedContacts: urgency?.unrepliedContacts ?? 0,
        },
        engagement: {
          newsletterSubscribers: summary?.engagement?.newsletterSubscribers ?? 0,
          contactForms: summary?.engagement?.contactForms ?? 0,
          unrepliedContacts: summary?.engagement?.unrepliedContacts ?? 0,
          pendingBookings: summary?.engagement?.pendingBookings ?? 0,
        },
        content: {
          totalPosts: (blogPosts ?? []).length,
          publishedPosts: publishedPosts.length,
          draftPosts: (blogPosts ?? []).length - publishedPosts.length,
          liveOffers: offers.length,
        },
        ai: {
          openai: ai.openai,
          deepseek: ai.deepseek,
          router: ai.router,
          premiumModel: ai.defaultPremiumModel,
          automationModel: ai.defaultAutomationModel,
          activeSessions: memory?.activeSessions ?? 0,
        },
        system: {
          lastLeadAt: health?.lastLeadAt ?? null,
          lastDigestAt: health?.lastDigestAt ?? null,
          totalLeads: health?.totalLeads ?? 0,
          totalPaidOrders: health?.totalPaidOrders ?? 0,
          totalAuditActions: health?.totalAuditActions ?? 0,
        },
      });
    } catch (e: any) {
      console.error("[executive] overview failed:", e?.message);
      res.status(500).json({ message: "Could not build executive overview." });
    }
  });

  // ─── AI Content Factory (admin-only) ───────────────────────────────────────
  app.get("/api/admin/content-factory/drafts", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const drafts = await storage.getContentDrafts(status);
      res.json(drafts);
    } catch (e: any) {
      console.error("[content-factory] list failed:", e?.message);
      res.status(500).json({ message: "Could not load drafts." });
    }
  });

  app.post("/api/admin/content-factory/generate", requireDashboardAuth, async (req, res) => {
    try {
      const { kind, topics, premium } = generateContentFactorySchema.parse(req.body);
      const created = [];
      const failed: string[] = [];
      for (const topic of topics) {
        try {
          const draft = await generateContentDraft(kind, topic, !!premium);
          created.push(await storage.createContentDraft(draft));
        } catch (err: any) {
          console.error(`[content-factory] generate failed for "${topic}":`, err?.message);
          failed.push(topic);
        }
      }
      res.json({ created, failed, generated: created.length });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      console.error("[content-factory] generate error:", err);
      res.status(500).json({ message: "Generation failed." });
    }
  });

  app.patch("/api/admin/content-factory/drafts/:id", requireDashboardAuth, async (req, res) => {
    try {
      const updates = updateContentDraftSchema.parse(req.body);
      const draft = await storage.updateContentDraft(Number(req.params.id), updates);
      if (!draft) return res.status(404).json({ message: "Not found" });
      res.json(draft);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Update failed." });
    }
  });

  app.post("/api/admin/content-factory/drafts/:id/approve", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    // Atomic, state-gated: only a draft can be approved.
    const draft = await storage.transitionContentDraftStatus(id, ["draft"], "approved");
    if (draft) return res.json(draft);
    const existing = await storage.getContentDraft(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    return res.status(409).json({ message: `Cannot approve a ${existing.status} draft.` });
  });

  app.post("/api/admin/content-factory/drafts/:id/reject", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    const draft = await storage.transitionContentDraftStatus(id, ["draft", "approved"], "rejected");
    if (draft) return res.json(draft);
    const existing = await storage.getContentDraft(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    return res.status(409).json({ message: `Cannot reject a ${existing.status} draft.` });
  });

  app.post("/api/admin/content-factory/drafts/:id/publish", requireDashboardAuth, async (req, res) => {
    try {
      const draft = await storage.getContentDraft(Number(req.params.id));
      if (!draft) return res.status(404).json({ message: "Not found" });

      // Idempotent: an already-published draft returns its existing post (no duplicate).
      if (draft.status === "published") {
        const existing = draft.publishedPostId ? await storage.getBlogPost(draft.publishedPostId) : null;
        return res.json({ draft, post: existing ?? null, note: "Already published." });
      }

      // Atomic claim: only one request can move approved → publishing. Losers get 409.
      const claimed = await storage.transitionContentDraftStatus(draft.id, ["approved"], "publishing");
      if (!claimed) {
        return res.status(409).json({ message: "Draft must be approved before publishing." });
      }

      if (claimed.kind !== "blog") {
        const updated = await storage.setContentDraftStatus(claimed.id, "published");
        return res.json({ draft: updated, post: null, note: "Marked published (non-blog kinds are not posted to /blog)." });
      }

      try {
        const baseSlug = claimed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180) || `post-${claimed.id}`;

        // Race-safe slug allocation: retry on unique-violation with incremented suffix.
        let created: Awaited<ReturnType<typeof storage.createBlogPost>> | null = null;
        let n = 0;
        while (!created && n < 50) {
          const slug = n === 0 ? baseSlug : `${baseSlug}-${n}`;
          if (await storage.getBlogPostBySlug(slug)) { n++; continue; }
          try {
            created = await storage.createBlogPost({
              title: claimed.title,
              slug,
              excerpt: claimed.excerpt || claimed.title,
              body: claimed.body,
              category: claimed.category,
            });
          } catch (err: any) {
            if (String(err?.code) === "23505" || /unique/i.test(err?.message ?? "")) { n++; continue; }
            throw err;
          }
        }
        if (!created) throw new Error("Could not allocate a unique slug.");

        const post = (await storage.toggleBlogPostPublished(created.id)) ?? created;
        const updated = await storage.setContentDraftStatus(claimed.id, "published", post.id);
        res.json({ draft: updated, post });
      } catch (inner: any) {
        // Release the claim so the draft can be retried.
        await storage.transitionContentDraftStatus(claimed.id, ["publishing"], "approved").catch(() => {});
        throw inner;
      }
    } catch (e: any) {
      console.error("[content-factory] publish failed:", e?.message);
      res.status(500).json({ message: "Publish failed." });
    }
  });

  app.delete("/api/admin/content-factory/drafts/:id", requireDashboardAuth, async (req, res) => {
    await storage.deleteContentDraft(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Founder Authority Layer ───────────────────────────────────────────────
  app.get("/api/authority", async (_req, res) => {
    const items = await storage.getAuthorityItems(true);
    res.json(items);
  });

  app.get("/api/admin/authority", requireDashboardAuth, async (_req, res) => {
    const items = await storage.getAuthorityItems(false);
    res.json(items);
  });

  app.post("/api/admin/authority", requireDashboardAuth, async (req, res) => {
    try {
      const data = insertAuthorityItemSchema.parse(req.body);
      const item = await storage.createAuthorityItem(data);
      res.json(item);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Create failed." });
    }
  });

  app.patch("/api/admin/authority/:id", requireDashboardAuth, async (req, res) => {
    try {
      const updates = updateAuthorityItemSchema.parse(req.body);
      const item = await storage.updateAuthorityItem(Number(req.params.id), updates);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Update failed." });
    }
  });

  app.delete("/api/admin/authority/:id", requireDashboardAuth, async (req, res) => {
    await storage.deleteAuthorityItem(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── AI Marketplace ────────────────────────────────────────────────────────
  app.get("/api/marketplace", async (_req, res) => {
    const products = await storage.getMarketplaceProducts(true);
    // Never expose delivery payload in the public listing.
    res.json(products.map(({ deliveryContent, ...pub }) => pub));
  });

  app.get("/api/marketplace/product/:slug", async (req, res) => {
    const product = await storage.getMarketplaceProductBySlug(req.params.slug);
    if (!product || !product.published) return res.status(404).json({ message: "Not found" });
    const { deliveryContent, ...pub } = product;
    res.json(pub);
  });

  // Create a Stripe Checkout session for a marketplace product.
  app.post("/api/marketplace/checkout", async (req, res) => {
    try {
      const { slug, customerEmail, sessionId: chatSessionId } = marketplaceCheckoutSchema.parse(req.body);
      const product = await storage.getMarketplaceProductBySlug(slug);
      if (!product || !product.published) return res.status(404).json({ message: "Product not found." });
      if (!isStripeConfigured() || !product.stripePriceId) {
        return res.status(503).json({ message: "Checkout is not available for this product yet." });
      }

      const rawHost =
        process.env.PUBLIC_BASE_URL ??
        process.env.CANONICAL_HOST ??
        process.env.RENDER_EXTERNAL_HOSTNAME ??
        (process.env.REPLIT_DOMAINS ?? "").split(",")[0] ??
        "localhost:5000";
      const cleanHost = rawHost.replace(/^https?:\/\//, "").replace(/\/$/, "") || "localhost:5000";
      const origin = cleanHost.startsWith("localhost") ? `http://${cleanHost}` : `https://${cleanHost}`;

      const stripe = await getUncachableStripeClient();
      const successParams = new URLSearchParams({ source: "marketplace", slug: product.slug });
      successParams.set("session_id", "{CHECKOUT_SESSION_ID}");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: product.stripePriceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/checkout/success?${successParams.toString()}`,
        cancel_url: `${origin}/marketplace`,
        customer_email: customerEmail || undefined,
        metadata: {
          sessionId: chatSessionId ?? "",
          source: "elevate360-marketplace",
          marketplaceSlug: product.slug,
          productName: product.name,
        },
      } as any);

      storage.createOrder({
        stripeSessionId: session.id,
        stripePriceId: product.stripePriceId,
        productName: product.name,
        customerEmail: customerEmail ?? "unknown",
        status: "initiated",
        fulfillmentStatus: "pending",
        sessionId: chatSessionId ?? undefined,
        metadata: {
          source: "elevate360-marketplace",
          marketplaceSlug: product.slug,
          checkoutCreatedAt: new Date().toISOString(),
        },
      }).catch(() => {});

      res.json({ url: session.url });
    } catch (e: any) {
      if (e instanceof ZodError) return res.status(400).json({ message: fromZodError(e).message });
      console.error("[marketplace] checkout error:", e?.message);
      if (e?.type === "StripeInvalidRequestError" || e?.statusCode === 400 || e?.statusCode === 404) {
        return res.status(400).json({ message: e.message ?? "Invalid checkout parameters." });
      }
      res.status(500).json({ message: "Could not create checkout session." });
    }
  });

  // Post-purchase digital delivery. Only returns the deliverable once the order is paid.
  app.get("/api/marketplace/delivery", async (req, res) => {
    const sessionId = (req.query.session_id as string | undefined)?.trim();
    if (!sessionId) return res.status(400).json({ message: "session_id required" });
    const order = await storage.getOrderByStripeSession(sessionId);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const slug = (order.metadata as any)?.marketplaceSlug as string | undefined;
    if (!slug) return res.status(404).json({ message: "Not a marketplace order." });

    if (order.status !== "paid") {
      return res.json({ status: order.status, fulfillmentStatus: order.fulfillmentStatus, productName: order.productName });
    }

    const product = await storage.getMarketplaceProductBySlug(slug);
    if (!product) return res.status(404).json({ message: "Product no longer available." });

    // Mark delivered for admin visibility (idempotent).
    if (order.fulfillmentStatus !== "delivered") {
      await storage.setOrderFulfillment(sessionId, "delivered").catch(() => {});
    }

    res.json({
      status: "paid",
      fulfillmentStatus: "delivered",
      productName: product.name,
      deliveryType: product.deliveryType,
      deliveryContent: product.deliveryContent,
    });
  });

  app.get("/api/admin/marketplace", requireDashboardAuth, async (_req, res) => {
    res.json(await storage.getMarketplaceProducts(false));
  });

  app.post("/api/admin/marketplace", requireDashboardAuth, async (req, res) => {
    try {
      const data = insertMarketplaceProductSchema.parse(req.body);
      const existing = await storage.getMarketplaceProductBySlug(data.slug);
      if (existing) return res.status(409).json({ message: "A product with that slug already exists." });
      const product = await storage.createMarketplaceProduct(data);
      res.json(product);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Create failed." });
    }
  });

  app.patch("/api/admin/marketplace/:id", requireDashboardAuth, async (req, res) => {
    try {
      const updates = updateMarketplaceProductSchema.parse(req.body);
      if (updates.slug) {
        const existing = await storage.getMarketplaceProductBySlug(updates.slug);
        if (existing && existing.id !== Number(req.params.id)) {
          return res.status(409).json({ message: "A product with that slug already exists." });
        }
      }
      const product = await storage.updateMarketplaceProduct(Number(req.params.id), updates);
      if (!product) return res.status(404).json({ message: "Not found" });
      res.json(product);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Update failed." });
    }
  });

  app.delete("/api/admin/marketplace/:id", requireDashboardAuth, async (req, res) => {
    await storage.deleteMarketplaceProduct(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Phase 56 — Autonomous AI Growth Engine (admin-only) ───────────────────
  app.get("/api/admin/growth/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const [latest, history] = await Promise.all([
        storage.getLatestGrowthReport(),
        storage.getGrowthReports(10),
      ]);
      res.json({ latest, history });
    } catch (e: any) {
      console.error("[growth] overview failed:", e?.message);
      res.status(500).json({ message: "Could not load growth reports." });
    }
  });

  app.post("/api/admin/growth/run", requireDashboardAuth, async (req, res) => {
    try {
      const windowDays = Math.min(Math.max(parseInt(String(req.body?.windowDays ?? "14"), 10) || 14, 3), 90);
      const forecastDays = Math.min(Math.max(parseInt(String(req.body?.forecastDays ?? "14"), 10) || 14, 3), 60);
      const { runGrowthEngine } = await import("./growth/growthEngine");
      const { report, recommendations, summary } = await runGrowthEngine({ windowDays, forecastDays });
      res.json({ ok: true, summary, report, recommendations });
    } catch (e: any) {
      console.error("[growth] run failed:", e?.message);
      res.status(500).json({ ok: false, message: "Growth engine run failed." });
    }
  });

  app.get("/api/admin/growth/recommendations", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 200);
      const rows = await storage.listGrowthRecommendations(status, limit);
      res.json(rows);
    } catch (e: any) {
      console.error("[growth] list recs failed:", e?.message);
      res.status(500).json({ message: "Could not list recommendations." });
    }
  });

  app.post("/api/admin/growth/recommendations/:id/decide", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid recommendation id." });
      }
      const decision = String(req.body?.decision ?? "").toLowerCase();
      if (!["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ message: "Invalid decision. Must be approved|rejected." });
      }
      const existing = await storage.getGrowthRecommendation(id);
      if (!existing) return res.status(404).json({ message: "Not found." });
      const decidedBy = "founder"; // single-founder system; future: req.user
      const notes = typeof req.body?.notes === "string" ? req.body.notes.slice(0, 1000) : undefined;
      const updated = await storage.updateGrowthRecommendationStatus(
        id,
        decision as any,
        decidedBy,
        notes
      );
      console.log(`[growthDecision] id=${id} status=${decision} by=${decidedBy}`);
      res.json({ ok: true, recommendation: updated });
    } catch (e: any) {
      console.error("[growth] decide failed:", e?.message);
      res.status(500).json({ ok: false, message: "Could not record decision." });
    }
  });

  // ─── Shared helpers for Phase 57 & 58 public telemetry ─────────────────────
  // Per-IP token-bucket rate limit + HMAC subject token with domain-scoped prefixes.
  const expRateBuckets = new Map<string, { tokens: number; ts: number }>();
  const EXP_RATE_CAP = 60;
  const EXP_RATE_WINDOW_MS = 60_000;
  function expRateLimit(req: any): boolean {
    // Use trusted IP helper (CF-Connecting-IP → req.ip hardened by trust proxy: 1).
    // Never trust raw x-forwarded-for here — it is spoofable.
    const ip = String(getClientIp(req)).slice(0, 64);
    const now = Date.now();
    const b = expRateBuckets.get(ip) ?? { tokens: EXP_RATE_CAP, ts: now };
    const elapsed = now - b.ts;
    b.tokens = Math.min(EXP_RATE_CAP, b.tokens + (elapsed / EXP_RATE_WINDOW_MS) * EXP_RATE_CAP);
    b.ts = now;
    if (b.tokens < 1) { expRateBuckets.set(ip, b); return false; }
    b.tokens -= 1;
    expRateBuckets.set(ip, b);
    if (expRateBuckets.size > 5000) {
      expRateBuckets.forEach((v, k) => {
        if (now - v.ts > EXP_RATE_WINDOW_MS * 5) expRateBuckets.delete(k);
      });
    }
    return true;
  }
  const EXP_TOKEN_SECRET = process.env.SESSION_SECRET || process.env.DASHBOARD_PIN || "elevate360-exp-fallback";
  // Domain-scoped HMAC: scope is namespaced with a fixed prefix so that an
  // experiment token (scope="exp:<experimentKey>") cannot ever validate as a
  // personalization token (scope="pers:personalization"), and vice versa.
  function signScopedToken(scope: string, subjectKey: string): string {
    return createHmac("sha256", EXP_TOKEN_SECRET)
      .update(`${scope}|${subjectKey}`).digest("hex").slice(0, 32);
  }
  function verifyScopedToken(scope: string, subjectKey: string, token: string): boolean {
    if (!token || typeof token !== "string" || token.length !== 32) return false;
    const expected = signScopedToken(scope, subjectKey);
    if (token.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  }
  // Backwards-compatible helpers that always namespace the scope so collisions
  // across product domains (experiments vs personalization) are impossible.
  function signSubject(experimentKey: string, subjectKey: string): string {
    return signScopedToken(`exp:${experimentKey}`, subjectKey);
  }
  function verifySubject(experimentKey: string, subjectKey: string, token: string): boolean {
    return verifyScopedToken(`exp:${experimentKey}`, subjectKey, token);
  }
  function signPersonalizationToken(subjectKey: string): string {
    return signScopedToken("pers:v1", subjectKey);
  }
  function verifyPersonalizationToken(subjectKey: string, token: string): boolean {
    return verifyScopedToken("pers:v1", subjectKey, token);
  }

  // ─── Phase 62 — Autonomous Execution Mesh ──────────────────────────────────
  app.get("/api/admin/mesh/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const [stats, agents, missions, comms, snap, queue] = await Promise.all([
        storage.getMeshStats(),
        storage.listMeshAgents(),
        storage.listMeshMissions(undefined, 20),
        storage.listMeshCommunications(20),
        storage.getLatestMeshTopologySnapshot(),
        storage.listMeshQueue(undefined, 30),
      ]);
      res.json({ stats, agents, missions, communications: comms, topology: snap, queue,
        providers: { openai: Boolean(process.env.OPENAI_API_KEY), deepseek: Boolean(process.env.DEEPSEEK_API_KEY) },
        generatedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error("[mesh] overview failed:", e?.message);
      res.status(500).json({ message: "Could not load mesh." });
    }
  });

  app.get("/api/admin/mesh/agents", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      res.json(await storage.listMeshAgents(status));
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/mesh/missions", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      res.json(await storage.listMeshMissions(status, 100));
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/mesh/missions/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const mission = await storage.getMeshMission(id);
      if (!mission) return res.status(404).json({ message: "Mission not found." });
      const [tasks, audit] = await Promise.all([
        storage.listMeshTasks(id),
        storage.listMeshAuditLogs(id, 50),
      ]);
      res.json({ mission, tasks, audit });
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/mesh/tasks", requireDashboardAuth, async (req, res) => {
    try {
      const missionId = req.query.missionId ? parseInt(String(req.query.missionId), 10) : undefined;
      res.json(await storage.listMeshTasks(missionId, 200));
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/mesh/topology", requireDashboardAuth, async (_req, res) => {
    try {
      let snap = await storage.getLatestMeshTopologySnapshot();
      if (!snap) {
        const { buildTopologySnapshot } = await import("./mesh/topologyEngine");
        snap = await buildTopologySnapshot();
      }
      res.json(snap);
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/mesh/communications", requireDashboardAuth, async (_req, res) => {
    try { res.json(await storage.listMeshCommunications(100)); }
    catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.post("/api/admin/mesh/missions", requireDashboardAuth, async (req, res) => {
    try {
      const { orchestrateMissionLifecycle } = await import("./mesh/missionEngine");
      const r = await orchestrateMissionLifecycle({
        title: String(req.body?.title || "Manual mission").slice(0, 200),
        objective: String(req.body?.objective || "").slice(0, 4000),
        workflowOrigin: String(req.body?.workflowOrigin || "manual").slice(0, 80),
        priority: typeof req.body?.priority === "number" ? req.body.priority : undefined,
        capabilities: Array.isArray(req.body?.capabilities) ? req.body.capabilities.slice(0, 12).map((c: any) => String(c).slice(0, 80)) : undefined,
        missionContext: req.body?.missionContext && typeof req.body.missionContext === "object" ? req.body.missionContext : {},
      });
      res.json({ ok: true, ...r });
    } catch (e: any) { res.status(400).json({ ok: false, message: e?.message || "Failed." }); }
  });

  app.post("/api/admin/mesh/missions/:id/cancel", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const { cancelMission } = await import("./mesh/missionEngine");
      res.json({ ok: true, mission: await cancelMission(id) });
    } catch (e: any) { res.status(400).json({ ok: false, message: e?.message || "Failed." }); }
  });

  app.post("/api/admin/mesh/run", requireDashboardAuth, async (_req, res) => {
    try {
      const { runMeshTick } = await import("./mesh/missionEngine");
      const r = await runMeshTick();
      res.json({ ok: true, ...r });
    } catch (e: any) {
      console.error("[mesh] tick failed:", e?.message);
      res.status(500).json({ ok: false, message: e?.message || "Tick failed." });
    }
  });

  // ─── Phase 61 — Neural Command Grid ────────────────────────────────────────
  app.get("/api/admin/command-grid/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const { getCommandGridOverview } = await import("./neural/commandGrid");
      res.json(await getCommandGridOverview());
    } catch (e: any) {
      console.error("[commandGrid] overview failed:", e?.message);
      res.status(500).json({ message: "Could not load command grid." });
    }
  });

  app.get("/api/admin/command-grid/signals", requireDashboardAuth, async (req, res) => {
    try {
      const severity = typeof req.query.severity === "string" ? req.query.severity.slice(0, 20) : undefined;
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      const limit = Math.min(200, parseInt(String(req.query.limit || "100"), 10) || 100);
      res.json(await storage.listNeuralSignals({ severity, status, limit }));
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.post("/api/admin/command-grid/signals", requireDashboardAuth, async (req, res) => {
    try {
      const { ingestSignal } = await import("./neural/commandBus");
      const sig = await ingestSignal({
        signalType: String(req.body?.signalType || "").slice(0, 60),
        source: String(req.body?.source || "manual").slice(0, 60),
        severity: req.body?.severity,
        confidence: Number(req.body?.confidence ?? 60),
        summary: String(req.body?.summary || "").slice(0, 600),
        metadata: req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {},
      });
      if (!sig) return res.status(409).json({ ok: false, message: "Duplicate open high/critical signal." });
      res.json({ ok: true, signal: sig });
    } catch (e: any) { res.status(400).json({ ok: false, message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/command-grid/escalations", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      res.json(await storage.listExecutiveEscalations(status, 100));
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.post("/api/admin/command-grid/escalations/:id/resolve", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const row = await storage.resolveExecutiveEscalation(id, "founder");
      res.json({ ok: true, escalation: row });
    } catch (e: any) { res.status(400).json({ ok: false, message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/command-grid/health", requireDashboardAuth, async (_req, res) => {
    try {
      let rows = await storage.listLatestGlobalHealthScores();
      if (rows.length === 0) {
        const { computeCategoryHealth } = await import("./neural/healthEngine");
        await computeCategoryHealth();
        rows = await storage.listLatestGlobalHealthScores();
      }
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.get("/api/admin/command-grid/insights", requireDashboardAuth, async (_req, res) => {
    try { res.json(await storage.listInsightStreamEntries(50)); }
    catch (e: any) { res.status(500).json({ message: e?.message || "Failed." }); }
  });

  app.post("/api/admin/command-grid/run", requireDashboardAuth, async (_req, res) => {
    try {
      const { runNeuralScan } = await import("./neural/commandGrid");
      const r = await runNeuralScan();
      res.json({ ok: true, ...r });
    } catch (e: any) {
      console.error("[commandGrid] run failed:", e?.message);
      res.status(500).json({ ok: false, message: e?.message || "Scan failed." });
    }
  });

  // ─── Phase 60 — AI Orchestrator Core ───────────────────────────────────────
  app.get("/api/admin/orchestrator/status", requireDashboardAuth, async (_req, res) => {
    try {
      const { listAgents, listWorkflowDefinitions } = await import("./orchestrator/core");
      const { listHardBlocks, listApprovalGates } = await import("./orchestrator/governance");
      const [stats, recent, agents, definitions] = await Promise.all([
        storage.getOrchestratorStats(),
        storage.listOrchestratorWorkflows(undefined, 25),
        Promise.resolve(listAgents()),
        Promise.resolve(listWorkflowDefinitions()),
      ]);
      res.json({
        stats,
        recentWorkflows: recent,
        agents: agents.map(a => ({
          key: a.key, description: a.description,
          allowedCapabilities: a.allowedCapabilities, restrictedCapabilities: a.restrictedCapabilities,
          providerPreference: a.providerPreference, cooldownMinutes: a.cooldownMinutes,
          executionTimeoutMs: a.executionTimeoutMs, retryLimit: a.retryLimit,
        })),
        workflowDefinitions: definitions.map(d => ({
          workflowKey: d.workflowKey, description: d.description,
          defaultPriority: d.defaultPriority, cooldownMinutes: d.cooldownMinutes,
          steps: d.steps,
        })),
        governance: { hardBlocks: listHardBlocks(), approvalGates: listApprovalGates() },
      });
    } catch (e: any) {
      console.error("[orchestrator] status failed:", e?.message);
      res.status(500).json({ message: "Could not load orchestrator status." });
    }
  });

  app.get("/api/admin/orchestrator/workflows", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 40) : undefined;
      const list = await storage.listOrchestratorWorkflows(status, 100);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed." });
    }
  });

  app.get("/api/admin/orchestrator/workflows/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const [wf, runs] = await Promise.all([
        storage.getOrchestratorWorkflow(id),
        storage.listOrchestratorAgentRuns(id),
      ]);
      if (!wf) return res.status(404).json({ message: "Not found." });
      res.json({ workflow: wf, agentRuns: runs });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed." });
    }
  });

  app.get("/api/admin/orchestrator/memory", requireDashboardAuth, async (req, res) => {
    try {
      const scope = typeof req.query.scope === "string" ? req.query.scope.slice(0, 80) : undefined;
      const rows = await storage.listOrchestratorMemory(scope);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed." });
    }
  });

  app.post("/api/admin/orchestrator/run", requireDashboardAuth, async (req, res) => {
    try {
      const workflowKey = String(req.body?.workflowKey || "").slice(0, 80);
      if (!workflowKey) return res.status(400).json({ message: "workflowKey required." });
      const { queueWorkflow, executeWorkflow } = await import("./orchestrator/core");
      const wf = await queueWorkflow(workflowKey, { triggeredBy: "founder", priority: 90 });
      const executed = await executeWorkflow(wf.id);
      res.json({ ok: true, workflow: executed });
    } catch (e: any) {
      console.error("[orchestrator] run failed:", e?.message);
      res.status(400).json({ ok: false, message: e?.message || "Run failed." });
    }
  });

  app.post("/api/admin/orchestrator/workflows/:id/approve", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const { decideWorkflow } = await import("./orchestrator/core");
      const wf = await decideWorkflow(id, "approve", "founder");
      res.json({ ok: true, workflow: wf });
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "Approve failed." });
    }
  });

  app.post("/api/admin/orchestrator/workflows/:id/reject", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const { decideWorkflow } = await import("./orchestrator/core");
      const wf = await decideWorkflow(id, "reject", "founder");
      res.json({ ok: true, workflow: wf });
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "Reject failed." });
    }
  });

  // ─── Phase 59 — AI Revenue Command Center ──────────────────────────────────
  app.get("/api/admin/revenue/overview", requireDashboardAuth, async (_req, res) => {
    try {
      const { getRevenueOverview } = await import("./revenue/commandCenter");
      const data = await getRevenueOverview();
      res.json(data);
    } catch (e: any) {
      console.error("[revenue] overview failed:", e?.message);
      res.status(500).json({ message: "Could not load revenue overview." });
    }
  });

  app.get("/api/admin/revenue/alerts", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      const alerts = await storage.listRevenueAlerts(status);
      res.json(alerts);
    } catch (e: any) {
      console.error("[revenue] alerts list failed:", e?.message);
      res.status(500).json({ message: "Could not load alerts." });
    }
  });

  app.post("/api/admin/revenue/run", requireDashboardAuth, async (req, res) => {
    try {
      const windowDays = Math.max(7, Math.min(90, Number(req.body?.windowDays) || 30));
      const { runRevenueCommandCenter } = await import("./revenue/commandCenter");
      const result = await runRevenueCommandCenter(windowDays);
      res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("[revenue] run failed:", e?.message);
      res.status(500).json({ ok: false, message: e?.message || "Run failed." });
    }
  });

  app.post("/api/admin/revenue/alerts/:id/acknowledge", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const { acknowledgeAlert } = await import("./revenue/commandCenter");
      const alert = await acknowledgeAlert(id, "founder");
      res.json({ ok: true, alert });
    } catch (e: any) {
      console.error("[revenue] ack failed:", e?.message);
      res.status(400).json({ ok: false, message: e?.message || "Acknowledge failed." });
    }
  });

  // ─── Phase 58 — Personalization Engine ──────────────────────────────────────
  app.get("/api/admin/personalization/segments", requireDashboardAuth, async (_req, res) => {
    try {
      const [segments, counts] = await Promise.all([
        storage.listPersonalizationSegments(),
        storage.getPersonalizationProfileCounts(),
      ]);
      res.json({ segments, counts });
    } catch (e: any) {
      console.error("[personalization] segments list failed:", e?.message);
      res.status(500).json({ message: "Could not list segments." });
    }
  });

  app.post("/api/admin/personalization/segments", requireDashboardAuth, async (req, res) => {
    try {
      const { upsertSegment } = await import("./personalization/engine");
      const segment = await upsertSegment(req.body);
      res.json({ ok: true, segment });
    } catch (e: any) {
      console.error("[personalization] upsert segment failed:", e?.message);
      res.status(400).json({ ok: false, message: e?.message || "Upsert failed." });
    }
  });

  app.get("/api/admin/personalization/rules", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      const surface = typeof req.query.surface === "string" ? req.query.surface.slice(0, 60) : undefined;
      const rules = await storage.listPersonalizationRules(status, surface);
      res.json(rules);
    } catch (e: any) {
      console.error("[personalization] list rules failed:", e?.message);
      res.status(500).json({ message: "Could not list rules." });
    }
  });

  app.post("/api/admin/personalization/propose", requireDashboardAuth, async (req, res) => {
    try {
      const surface = String(req.body?.surface ?? "").slice(0, 60);
      const hypothesis = typeof req.body?.hypothesis === "string" ? req.body.hypothesis.slice(0, 600) : undefined;
      const { proposeRulesForSurface } = await import("./personalization/engine");
      const result = await proposeRulesForSurface({ surface, hypothesis });
      res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("[personalization] propose failed:", e?.message);
      res.status(400).json({ ok: false, message: e?.message || "Propose failed." });
    }
  });

  app.post("/api/admin/personalization/rules/:id/decide", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const action = String(req.body?.action ?? "").toLowerCase();
      if (!["approve", "reject", "activate", "deactivate"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be approve|reject|activate|deactivate." });
      }
      const { decideRule } = await import("./personalization/engine");
      const rule = await decideRule(id, action as any, "founder");
      res.json({ ok: true, rule });
    } catch (e: any) {
      console.error("[personalization] decide rule failed:", e?.message);
      res.status(400).json({ ok: false, message: e?.message || "Decision failed." });
    }
  });

  app.get("/api/admin/personalization/analytics", requireDashboardAuth, async (req, res) => {
    try {
      const surface = typeof req.query.surface === "string" ? req.query.surface.slice(0, 60) : undefined;
      const { analyzePerformance } = await import("./personalization/engine");
      const result = await analyzePerformance(surface);
      res.json(result);
    } catch (e: any) {
      console.error("[personalization] analytics failed:", e?.message);
      res.status(500).json({ message: "Analytics failed." });
    }
  });

  app.get("/api/admin/personalization/surfaces", requireDashboardAuth, async (_req, res) => {
    const { SAFE_SURFACES } = await import("./personalization/engine");
    res.json({ surfaces: SAFE_SURFACES });
  });

  // Public personalization endpoints (rate-limited, HMAC-token for events).
  app.post("/api/personalization/classify", async (req, res) => {
    if (!expRateLimit(req)) return res.status(429).json({ message: "Too many requests." });
    try {
      const subjectKey = String(req.body?.subjectKey ?? "").slice(0, 120);
      if (!subjectKey) return res.status(400).json({ message: "subjectKey required." });
      const { classifySubject } = await import("./personalization/engine");
      const { profile } = await classifySubject(subjectKey, req.body?.signals ?? {});
      const subjectToken = signPersonalizationToken(subjectKey);
      res.json({
        subjectKey: profile.subjectKey,
        segmentKey: profile.segmentKey,
        behavioralScore: profile.behavioralScore,
        intent: profile.intent,
        funnelStage: profile.funnelStage,
        subjectToken,
      });
    } catch (e: any) {
      console.error("[personalization] classify failed:", e?.message);
      res.status(500).json({ message: "Classify failed." });
    }
  });

  app.post("/api/personalization/content", async (req, res) => {
    if (!expRateLimit(req)) return res.status(429).json({ message: "Too many requests." });
    try {
      const surface = String(req.body?.surface ?? "").slice(0, 60);
      const subjectKey = String(req.body?.subjectKey ?? "").slice(0, 120);
      if (!surface || !subjectKey) return res.status(400).json({ message: "surface and subjectKey required." });
      const { getPersonalizedContent, isSafeSurface } = await import("./personalization/engine");
      if (!isSafeSurface(surface)) return res.status(400).json({ message: "Surface is not on the safe list." });
      const result = await getPersonalizedContent(surface, subjectKey);
      res.json(result);
    } catch (e: any) {
      console.error("[personalization] content failed:", e?.message);
      res.status(500).json({ message: "Content fetch failed." });
    }
  });

  app.post("/api/personalization/event", async (req, res) => {
    if (!expRateLimit(req)) return res.status(429).json({ message: "Too many requests." });
    try {
      const subjectKey = String(req.body?.subjectKey ?? "").slice(0, 120);
      const subjectToken = String(req.body?.subjectToken ?? "");
      const surface = String(req.body?.surface ?? "").slice(0, 60);
      const eventType = String(req.body?.eventType ?? "view").slice(0, 40);
      const ruleId = typeof req.body?.ruleId === "number" ? req.body.ruleId : null;
      const value = typeof req.body?.value === "number" ? req.body.value : null;
      if (!subjectKey || !surface) return res.status(400).json({ message: "subjectKey and surface required." });
      if (!verifyPersonalizationToken(subjectKey, subjectToken)) {
        return res.status(401).json({ ok: false, message: "Invalid subject token. Call /api/personalization/classify first." });
      }
      const { recordPersonalizationEvent, isSafeSurface } = await import("./personalization/engine");
      if (!isSafeSurface(surface)) return res.status(400).json({ message: "Surface is not on the safe list." });
      const result = await recordPersonalizationEvent({ subjectKey, surface, eventType, ruleId, value });
      res.json(result);
    } catch (e: any) {
      console.error("[personalization] event failed:", e?.message);
      res.status(500).json({ message: "Event failed." });
    }
  });

  // ─── Phase 57 — Experiment Orchestrator ─────────────────────────────────────
  app.get("/api/admin/experiments", requireDashboardAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status.slice(0, 20) : undefined;
      const rows = await storage.listExperiments(status, 200);
      res.json(rows);
    } catch (e: any) {
      console.error("[experiments] list failed:", e?.message);
      res.status(500).json({ message: "Could not list experiments." });
    }
  });

  app.get("/api/admin/experiments/:id", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const exp = await storage.getExperiment(id);
      if (!exp) return res.status(404).json({ message: "Not found." });
      const stats = await storage.getExperimentVariantStats(id);
      const { computeAnalysis } = await import("./experiments/orchestrator");
      const analysis = computeAnalysis(exp.variants as any, stats);
      res.json({ experiment: exp, analysis });
    } catch (e: any) {
      console.error("[experiments] get failed:", e?.message);
      res.status(500).json({ message: "Could not load experiment." });
    }
  });

  app.post("/api/admin/experiments/propose", requireDashboardAuth, async (req, res) => {
    try {
      const recommendationId = req.body?.recommendationId
        ? parseInt(String(req.body.recommendationId), 10) || undefined
        : undefined;
      const hypothesis = typeof req.body?.hypothesis === "string" ? req.body.hypothesis.slice(0, 600) : undefined;
      const surface = typeof req.body?.surface === "string" ? req.body.surface.slice(0, 60) : undefined;
      const targetMetric = typeof req.body?.targetMetric === "string" ? req.body.targetMetric.slice(0, 60) : undefined;
      const { proposeFromRecommendation } = await import("./experiments/orchestrator");
      const { experiment } = await proposeFromRecommendation({ recommendationId, hypothesis, surface, targetMetric });
      res.json({ ok: true, experiment });
    } catch (e: any) {
      console.error("[experiments] propose failed:", e?.message);
      res.status(500).json({ ok: false, message: e?.message || "Propose failed." });
    }
  });

  app.post("/api/admin/experiments/:id/decide", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const action = String(req.body?.action ?? "").toLowerCase();
      if (!["approve", "reject", "start", "complete", "rollback"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be approve|reject|start|complete|rollback." });
      }
      const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined;
      const { decideExperiment } = await import("./experiments/orchestrator");
      const experiment = await decideExperiment(id, action as any, "founder", reason);
      res.json({ ok: true, experiment });
    } catch (e: any) {
      console.error("[experiments] decide failed:", e?.message);
      res.status(400).json({ ok: false, message: e?.message || "Decision failed." });
    }
  });

  app.post("/api/admin/experiments/:id/analyze", requireDashboardAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
      const { analyzeExperiment } = await import("./experiments/orchestrator");
      const result = await analyzeExperiment(id);
      res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("[experiments] analyze failed:", e?.message);
      res.status(500).json({ ok: false, message: e?.message || "Analyze failed." });
    }
  });

  // Public experiment telemetry — uses shared expRateLimit / signSubject / verifySubject above.
  app.post("/api/experiments/assign", async (req, res) => {
    if (!expRateLimit(req)) return res.status(429).json({ message: "Too many requests." });
    try {
      const experimentKey = String(req.body?.experimentKey ?? "").slice(0, 120);
      const subjectKey = String(req.body?.subjectKey ?? "").slice(0, 120);
      if (!experimentKey || !subjectKey) return res.status(400).json({ message: "experimentKey and subjectKey required." });
      const { assignVariant } = await import("./experiments/orchestrator");
      const result = await assignVariant(experimentKey, subjectKey);
      // Issue an HMAC subject token; events must present it to be accepted.
      // Token is only useful for THIS (experiment, subject) pair, so it can't be replayed against others.
      const subjectToken = signSubject(experimentKey, subjectKey);
      res.json({ ...result, subjectToken });
    } catch (e: any) {
      console.error("[experiments] assign failed:", e?.message);
      res.status(500).json({ message: "Assign failed." });
    }
  });

  app.post("/api/experiments/event", async (req, res) => {
    if (!expRateLimit(req)) return res.status(429).json({ message: "Too many requests." });
    try {
      const experimentKey = String(req.body?.experimentKey ?? "").slice(0, 120);
      const subjectKey = String(req.body?.subjectKey ?? "").slice(0, 120);
      const subjectToken = String(req.body?.subjectToken ?? "");
      const eventType = String(req.body?.eventType ?? "conversion").slice(0, 40);
      const value = typeof req.body?.value === "number" ? req.body.value : null;
      if (!experimentKey || !subjectKey) return res.status(400).json({ message: "experimentKey and subjectKey required." });
      if (!verifySubject(experimentKey, subjectKey, subjectToken)) {
        return res.status(401).json({ ok: false, message: "Invalid subject token. Call /api/experiments/assign first." });
      }
      const { recordEvent } = await import("./experiments/orchestrator");
      const result = await recordEvent(experimentKey, subjectKey, eventType, value);
      res.json(result);
    } catch (e: any) {
      console.error("[experiments] event failed:", e?.message);
      res.status(500).json({ message: "Event failed." });
    }
  });

  app.post("/api/admin/ops/briefing", requireDashboardAuth, async (_req, res) => {
    try {
      const { buildOpsOverview, generateFounderBriefing } = await import(
        "./telemetry/operationsCenter"
      );
      const overview = await buildOpsOverview();
      const result = await generateFounderBriefing(overview);
      console.log(
        `[opsBriefing] provider=${result.provider} latency=${result.latencyMs}ms length=${result.briefing.length}`
      );
      res.json({
        ok: true,
        briefing: result.briefing,
        provider: result.provider,
        latencyMs: result.latencyMs,
        generatedAt: overview.generatedAt,
      });
    } catch (e: any) {
      console.error("[ops] briefing failed:", e?.message);
      res.status(500).json({ ok: false, message: "Briefing generation failed." });
    }
  });

  app.get("/api/health", async (_req, res) => {
    const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};

    // DB ping
    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = { ok: true, latencyMs: Date.now() - dbStart };
    } catch (e: any) {
      checks.database = { ok: false, detail: e.message };
    }

    // AI router + memory cache
    const memStats = getMemoryStats();
    const aiStatus = getAIStatus();
    checks.openai = {
      ok: aiStatus.openai === "configured",
      detail: aiStatus.openai,
    };
    checks.ai = {
      ok: aiStatus.openai === "configured" || aiStatus.deepseek === "configured",
      detail: `router=${aiStatus.router} premium=${aiStatus.defaultPremiumModel} automation=${aiStatus.defaultAutomationModel}`,
      ...aiStatus,
    };
    checks.memory = {
      ok: true,
      detail: `${memStats.activeSessions} sessions, oldest ${memStats.oldestEntryAgeMs ?? 0}ms`,
      ...memStats,
    };

    // Resend env var
    checks.resend = { ok: !!process.env.RESEND_API_KEY, detail: process.env.RESEND_API_KEY ? "key present" : "RESEND_API_KEY missing" };

    // Stripe connectivity (native SDK — checks STRIPE_SECRET_KEY env var only)
    const stripeOk = isStripeConfigured();
    checks.stripe = {
      ok: stripeOk,
      detail: stripeOk ? "configured" : "STRIPE_SECRET_KEY missing",
    };

    const allOk = Object.values(checks).every((c) => c.ok);
    res.status(allOk ? 200 : 503).json({ status: allOk ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() });
  });

  // Phase 45 — Audit log routes
  app.get("/api/dashboard/audit-logs", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ message: "Could not load audit logs." });
    }
  });

  // Phase 47 — Dashboard Summary (single-call snapshot for summary cards)
  app.get("/api/dashboard/summary", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (e: any) {
      console.error("[dashboard/summary] error:", e.message);
      res.status(500).json({ message: "Could not load dashboard summary." });
    }
  });

  app.get("/api/dashboard/system-health", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const summary = await storage.getSystemHealthSummary();
      res.json(summary);
    } catch (e: any) {
      res.status(500).json({ message: "Could not load system health." });
    }
  });

  // Phase 44 — Revenue Attribution Dashboard
  app.get("/api/dashboard/revenue-attribution", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const data = await storage.getRevenueAttributionData();
      res.json(data);
    } catch (e: any) {
      console.error("[revenue-attribution] error:", e.message);
      res.status(500).json({ message: "Could not load revenue attribution data." });
    }
  });

  // Phase 43 — Offer Recommendation Optimization
  app.get("/api/dashboard/offer-optimizer", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const [data, overrides] = await Promise.all([
        storage.getOfferOptimizerData(),
        storage.getOfferMappingOverrides(),
      ]);
      // Inject current mapping into perIntent (from code defaults + overrides)
      const { INTENT_OFFER_MAP_DEFAULT } = await import("./ai/leadScoring");
      const overrideMap: Record<string, string> = {};
      for (const o of overrides.filter((x) => x.isActive)) overrideMap[o.intent] = o.overrideOffer;
      for (const [intent, intentData] of Object.entries(data.perIntent)) {
        intentData.currentMapping = overrideMap[intent] ?? INTENT_OFFER_MAP_DEFAULT[intent] ?? null;
      }
      res.json({ ...data, overrides });
    } catch (e: any) {
      console.error("[offer-optimizer] error:", e.message);
      res.status(500).json({ message: "Could not load optimizer data." });
    }
  });

  app.post("/api/dashboard/offer-optimizer/override", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { intent, offer } = req.body;
    if (!intent || !offer) return res.status(400).json({ message: "intent and offer required" });
    try {
      const result = await storage.setOfferMappingOverride(intent, offer);
      res.json(result);
    } catch (e: any) {
      console.error("[offer-optimizer/override] error:", e.message);
      res.status(500).json({ message: "Could not save override." });
    }
  });

  app.delete("/api/dashboard/offer-optimizer/override/:intent", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { intent } = req.params;
    try {
      await storage.removeOfferMappingOverride(intent);
      storage.createAuditLog({ action: "offer_override_removed", resourceType: "offer_override", resourceId: intent }).catch(() => {});
      res.json({ ok: true });
    } catch (e: any) {
      console.error("[offer-optimizer/override/delete] error:", e.message);
      res.status(500).json({ message: "Could not remove override." });
    }
  });

  app.patch("/api/dashboard/offer-optimizer/override/:intent/toggle", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { intent } = req.params;
    const { isActive } = req.body;
    try {
      await storage.toggleOfferMappingOverride(intent, Boolean(isActive));
      res.json({ ok: true });
    } catch (e: any) {
      console.error("[offer-optimizer/toggle] error:", e.message);
      res.status(500).json({ message: "Could not toggle override." });
    }
  });

  // Phase 48 — Automation Engine Settings & Control
  app.get("/api/dashboard/automation/settings", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const DEFAULTS: Record<string, string> = {
        auto_followup_enabled: "false",
        auto_followup_min_score: "50",
        auto_followup_max_per_day: "5",
        auto_followup_max_per_lead: "3",
        auto_followup_interval_hours: "6",
      };
      const entries = await Promise.all(
        Object.keys(DEFAULTS).map(async (k) => [k, (await storage.getAutomationSetting(k)) ?? DEFAULTS[k]])
      );
      res.json(Object.fromEntries(entries));
    } catch (e: any) {
      res.status(500).json({ message: "Could not load settings." });
    }
  });

  app.patch("/api/dashboard/automation/settings", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const allowed = ["auto_followup_enabled", "auto_followup_min_score", "auto_followup_max_per_day", "auto_followup_max_per_lead", "auto_followup_interval_hours"];
    try {
      const updates = Object.entries(req.body as Record<string, string>).filter(([k]) => allowed.includes(k));
      await Promise.all(updates.map(([k, v]) => storage.setAutomationSetting(k, String(v))));
      res.json({ ok: true, updated: updates.map(([k]) => k) });
    } catch (e: any) {
      res.status(500).json({ message: "Could not save settings." });
    }
  });

  app.post("/api/dashboard/stripe/sync", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    // Native Stripe SDK queries the Stripe API directly — no local sync table required.
    // This endpoint is a no-op retained for dashboard UI compatibility.
    if (!isStripeConfigured()) {
      return res.status(503).json({ ok: false, message: "STRIPE_SECRET_KEY not configured" });
    }
    res.json({ ok: true, message: "Native Stripe SDK in use — sync not required" });
  });

  app.post("/api/dashboard/automation/run-now", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { runFollowupCycle } = await import("./automation/followupEngine");
      const result = await runFollowupCycle();
      res.json(result);
    } catch (e: any) {
      console.error("[automation/run-now] error:", e.message);
      res.status(500).json({ message: "Cycle failed: " + e.message });
    }
  });

  app.get("/api/dashboard/automation/status", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { getEngineStatus } = await import("./automation/followupEngine");
      res.json(getEngineStatus());
    } catch (e: any) {
      res.status(500).json({ message: "Could not get status." });
    }
  });

  app.get("/api/dashboard/automation/log", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const all = await storage.getAuditLogs(200);
      res.json(all.filter((l) => l.action === "auto_followup_sent").slice(0, 50));
    } catch (e: any) {
      res.status(500).json({ message: "Could not load automation log." });
    }
  });

  // Phase 42 — Follow-Up Automation: Reminder Queue
  app.get("/api/dashboard/reminder-queue", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const queue = await storage.getReminderQueue();
      res.json(queue);
    } catch (e: any) {
      console.error("[reminder-queue] error:", e.message);
      res.status(500).json({ message: "Could not load reminder queue." });
    }
  });

  // Phase 42 — Generate AI Follow-Up Draft
  app.post("/api/dashboard/leads/:sessionId/followup-draft", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { sessionId } = req.params;
    try {
      const conv = await storage.getChatConversation(sessionId);
      if (!conv) return res.status(404).json({ message: "Lead not found" });
      const { generateFollowupDraft } = await import("./openai");
      const now = new Date();
      const lastActivity = conv.lastActivityAt ?? conv.updatedAt;
      const daysSilent = lastActivity
        ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const draft = await generateFollowupDraft({
        leadName: conv.leadName ?? conv.capturedName,
        leadEmail: conv.leadEmail ?? conv.capturedEmail,
        intent: conv.intent,
        sessionSummary: conv.sessionSummary,
        recommendedOffer: conv.recommendedOffer,
        daysSilent,
      });
      res.json(draft);
    } catch (e: any) {
      console.error("[followup-draft] error:", e.message);
      res.status(500).json({ message: "Could not generate follow-up draft." });
    }
  });

  // Phase 42 — Mark Follow-Up Sent (extends due date by 5 days)
  app.post("/api/dashboard/leads/:sessionId/followup-sent", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { sessionId } = req.params;
    try {
      const newDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      await storage.markFollowupSent(sessionId, newDueDate);
      storage.createAuditLog({ action: "followup_sent", resourceType: "lead", resourceId: sessionId }).catch(() => {});
      res.json({ ok: true, newDueDate });
    } catch (e: any) {
      console.error("[followup-sent] error:", e.message);
      res.status(500).json({ message: "Could not mark follow-up sent." });
    }
  });

  // Phase 41 — Conversion Funnel
  app.get("/api/dashboard/funnel", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const data = await storage.getConversionFunnel();
      res.json(data);
    } catch (e: any) {
      console.error("[funnel] error:", e.message);
      res.status(500).json({ message: "Could not compute funnel." });
    }
  });

  // Phase 41 — Conversion Analytics (intent × offer × consultation)
  app.get("/api/dashboard/conversion", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const data = await storage.getConversionAnalytics();
      res.json(data);
    } catch (e: any) {
      console.error("[conversion] error:", e.message);
      res.status(500).json({ message: "Could not compute conversion analytics." });
    }
  });

  // Phase 41 — Urgency Dashboard (top action-items row)
  app.get("/api/dashboard/urgency", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const data = await storage.getUrgencyDashboard();
      res.json(data);
    } catch (e: any) {
      console.error("[urgency] error:", e.message);
      res.status(500).json({ message: "Could not compute urgency data." });
    }
  });

  // Phase 41 — Mark offer accepted (called from checkout success)
  app.post("/api/checkout/offer-accepted", async (req, res) => {
    const { sessionId, offerSlug, source } = req.body;
    if (!sessionId || !offerSlug) return res.status(400).json({ message: "sessionId and offerSlug required" });
    try {
      await storage.markOfferAccepted(sessionId, offerSlug, source ?? "page");
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  // Phase 39 — Dashboard Intelligence KPIs
  app.get("/api/dashboard/intelligence", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const intelligence = await storage.getDashboardIntelligence();
      res.json(intelligence);
    } catch (e: any) {
      console.error("[intelligence] error:", e.message);
      res.status(500).json({ message: "Could not compute intelligence." });
    }
  });

  // Phase 39 — Digest: generate (POST) + fetch latest (GET)
  app.post("/api/digest/generate", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const digest = await generateAndSaveDigest();
      res.json(digest);
    } catch (e: any) {
      console.error("[digest] generation error:", e.message);
      res.status(500).json({ message: "Digest generation failed: " + e.message });
    }
  });

  app.get("/api/digest/latest", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const digest = await storage.getLatestDigest();
    res.json(digest);
  });

  app.get("/api/digest/all", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const digests = await storage.getAllDigests();
    res.json(digests);
  });

  app.get("/api/config/public", (_req, res) => {
    res.json({
      whatsappNumber: process.env.WHATSAPP_NUMBER || null,
      announcementText: process.env.ANNOUNCEMENT_TEXT || null,
      announcementUrl: process.env.ANNOUNCEMENT_URL || null,
    });
  });

  // ─── Phase 46: Internal Audit Routes ─────────────────────────────────────────

  // POST /api/dashboard/audit/run — run full or targeted audit
  app.post("/api/dashboard/audit/run", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const { auditType = "full" } = req.body ?? {};
    const allowed = ["full", "revenue", "attribution", "funnel", "followup", "reliability", "continuity", "security"];
    if (!allowed.includes(auditType)) {
      return res.status(400).json({ message: `Invalid auditType. Must be one of: ${allowed.join(", ")}` });
    }
    try {
      const result = await runAudit(auditType, "admin");
      return res.json({ ok: true, run: result.run, checksCount: result.checks.length, issuesCreated: result.issuesCreated });
    } catch (err: any) {
      console.error("[audit] run error:", err.message);
      return res.status(500).json({ message: "Audit failed: " + err.message });
    }
  });

  // GET /api/dashboard/audit/summary — latest run summary
  app.get("/api/dashboard/audit/summary", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const rows = await db.select().from(auditRuns).orderBy(desc(auditRuns.createdAt)).limit(1);
    const latestRun = rows[0] ?? null;
    const openIssues = await db.select().from(auditIssues);
    const criticalOpen = openIssues.filter((i) => i.severity === "critical" && i.status === "open").length;
    const highOpen = openIssues.filter((i) => i.severity === "high" && i.status === "open").length;
    return res.json({ ok: true, latestRun, openIssueCount: openIssues.filter(i => i.status === "open").length, criticalOpen, highOpen });
  });

  // GET /api/dashboard/audit/runs — audit history
  app.get("/api/dashboard/audit/runs", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const rows = await db.select().from(auditRuns).orderBy(desc(auditRuns.createdAt)).limit(20);
    return res.json(rows);
  });

  // GET /api/dashboard/audit/runs/:id/checks — checks for a run
  app.get("/api/dashboard/audit/runs/:id/checks", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid run ID" });
    const rows = await db.select().from(auditChecks).where(eq(auditChecks.auditRunId, id)).orderBy(auditChecks.checkGroup, auditChecks.checkKey);
    return res.json(rows);
  });

  // GET /api/dashboard/audit/issues — all issues (with optional status/severity filter)
  app.get("/api/dashboard/audit/issues", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    let rows = await db.select().from(auditIssues).orderBy(desc(auditIssues.createdAt));
    const { status, severity } = req.query as Record<string, string>;
    if (status) rows = rows.filter((r) => r.status === status);
    if (severity) rows = rows.filter((r) => r.severity === severity);
    return res.json(rows);
  });

  // POST /api/dashboard/audit/issues — create manual issue
  app.post("/api/dashboard/audit/issues", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const parsed = insertAuditIssueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    const [created] = await db.insert(auditIssues).values(parsed.data).returning();
    return res.status(201).json(created);
  });

  // PATCH /api/dashboard/audit/issues/:id — update issue status/owner/notes
  app.patch("/api/dashboard/audit/issues/:id", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid issue ID" });
    const parsed = updateAuditIssueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "fixed" && !parsed.data.resolvedAt) {
      updates.resolvedAt = new Date();
    }
    const [updated] = await db.update(auditIssues).set(updates).where(eq(auditIssues.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Issue not found" });
    return res.json(updated);
  });

  // GET /api/dashboard/audit/export — markdown export
  app.get("/api/dashboard/audit/export", async (req, res) => {
    if (!isDashboardAuthed(req)) return res.status(401).json({ message: "Unauthorized" });
    const runId = req.query.runId ? parseInt(req.query.runId as string) : null;
    const runs = runId
      ? await db.select().from(auditRuns).where(eq(auditRuns.id, runId))
      : await db.select().from(auditRuns).orderBy(desc(auditRuns.createdAt)).limit(1);
    const run = runs[0];
    if (!run) return res.status(404).json({ message: "No audit run found" });
    const checks = await db.select().from(auditChecks).where(eq(auditChecks.auditRunId, run.id)).orderBy(auditChecks.checkGroup, auditChecks.checkKey);
    const issues = await db.select().from(auditIssues).orderBy(desc(auditIssues.createdAt));
    const now = new Date().toISOString().split("T")[0];
    let md = `# Elevate360Official — Audit Report\n\n`;
    md += `**Date:** ${now}  \n**Audit Type:** ${run.auditType}  \n**Verdict:** ${run.overallVerdict ?? "—"}  \n`;
    md += `**Checks Passed:** ${run.checksPassed}  **Failed:** ${run.checksFailed}  `;
    md += `**Critical:** ${run.criticalCount}  **High:** ${run.highCount}\n\n---\n\n`;
    md += `## Checks\n\n| Group | Check | Severity | Status | Expected | Actual |\n|---|---|---|---|---|---|\n`;
    for (const c of checks) {
      const statusEmoji = c.status === "pass" ? "✅" : c.status === "warning" ? "⚠️" : "❌";
      md += `| ${c.checkGroup} | ${c.title} | ${c.severity} | ${statusEmoji} ${c.status} | ${c.expectedValue ?? ""} | ${c.actualValue ?? ""} |\n`;
    }
    md += `\n## Open Issues\n\n| Code | Area | Severity | Expected | Actual | Status |\n|---|---|---|---|---|---|\n`;
    for (const i of issues.filter(i => i.status === "open")) {
      md += `| ${i.issueCode} | ${i.area} | ${i.severity} | ${i.expected} | ${i.actual} | ${i.status} |\n`;
    }
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="elevate360-audit-${now}.md"`);
    return res.send(md);
  });

  // ── Phase 49 — Automation Jobs ───────────────────────────────────────────────

  app.get("/api/automation/jobs", requireDashboardAuth, async (_req, res) => {
    const jobs = await storage.getAutomationJobs();
    res.json(jobs);
  });

  app.get("/api/automation/jobs/:jobKey/log", requireDashboardAuth, async (req, res) => {
    const logs = await storage.getAutomationJobLogs(req.params.jobKey, 100);
    res.json(logs);
  });

  // ── Phase 49 — Revenue Recovery ──────────────────────────────────────────────

  app.get("/api/automation/revenue-recovery/status", requireDashboardAuth, async (_req, res) => {
    const [actions, jobs] = await Promise.all([
      storage.getRevenueRecoveryActions(500),
      storage.getAutomationJobs(),
    ]);
    const job = jobs.find((x) => x.jobKey === "phase49_revenue_recovery");
    res.json({
      enabled: job?.isEnabled ?? true,
      lastRunAt: job?.lastFinishedAt ?? null,
      nextRunAt: job?.nextRunAt ?? null,
      openActions: actions.filter((x) => x.status === "open").length,
      queuedActions: actions.filter((x) => x.status === "queued").length,
      wonRecoveries30d: actions.filter((x) => x.status === "won").length,
      staleFulfillmentCount: actions.filter((x) => x.recoveryType === "stale_fulfillment" && x.status === "open").length,
    });
  });

  app.post("/api/automation/revenue-recovery/run-now", requireDashboardAuth, async (_req, res) => {
    try {
      const result = await runRevenueRecoveryEngine();
      res.json({ ok: true, ...result });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/automation/revenue-recovery/actions", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getRevenueRecoveryActions(200);
    res.json(rows);
  });

  app.patch("/api/automation/revenue-recovery/actions/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const patch = updateRevenueRecoveryActionSchema.parse(req.body);
    const row = await storage.updateRevenueRecoveryAction(id, patch);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // ── Phase 49 — Content Opportunities ─────────────────────────────────────────

  app.get("/api/automation/content-opportunities", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getContentOpportunities(200);
    res.json(rows);
  });

  app.post("/api/automation/content-opportunities/generate", requireDashboardAuth, async (_req, res) => {
    try {
      const result = await runContentOpportunityEngine();
      res.json({ ok: true, ...result });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/automation/content-opportunities/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const patch = updateContentOpportunitySchema.parse(req.body);
    const row = await storage.updateContentOpportunity(id, patch);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // ── Phase 49 — Executive Digests ─────────────────────────────────────────────

  app.get("/api/digest/founder-brief/latest", requireDashboardAuth, async (_req, res) => {
    const row = await storage.getLatestDigestByType("founder_weekly_brief");
    res.json(row ?? null);
  });

  app.post("/api/digest/founder-brief/generate", requireDashboardAuth, async (_req, res) => {
    try {
      const result = await generateFounderWeeklyBrief();
      res.json({ ok: true, ...result });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/digest/monthly-strategy/latest", requireDashboardAuth, async (_req, res) => {
    const row = await storage.getLatestDigestByType("monthly_strategy_brief");
    res.json(row ?? null);
  });

  app.post("/api/digest/monthly-strategy/generate", requireDashboardAuth, async (_req, res) => {
    try {
      const result = await generateMonthlyStrategyBrief();
      res.json({ ok: true, ...result });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Phase 49 — Autonomous Alerts ─────────────────────────────────────────────

  app.get("/api/audit/autonomous-alerts", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getAutonomousAlerts(200);
    res.json(rows);
  });

  app.post("/api/audit/run-autonomous-checks", requireDashboardAuth, async (_req, res) => {
    try {
      const result = await runAnomalyEngine();
      res.json({ ok: true, ...result });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/audit/autonomous-alerts/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const patch = updateAutonomousAlertSchema.parse(req.body);
    const row = await storage.updateAutonomousAlert(id, patch);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // ─── Phase 50: Growth Optimization ─────────────────────────────────────────

  app.get("/api/growth/source-performance", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getLatestSourcePerformance(100);
    res.json(rows);
  });

  app.post("/api/growth/source-performance/generate", requireDashboardAuth, async (_req, res) => {
    const { runSourcePerformanceEngine } = await import("./automation/sourcePerformanceEngine");
    const result = await runSourcePerformanceEngine();
    res.json({ ok: true, ...result });
  });

  app.get("/api/growth/funnel-leaks", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getLatestFunnelLeaks(50);
    res.json(rows);
  });

  app.post("/api/growth/funnel-leaks/generate", requireDashboardAuth, async (_req, res) => {
    const { runFunnelLeakEngine } = await import("./automation/funnelLeakEngine");
    const result = await runFunnelLeakEngine();
    res.json({ ok: true, ...result });
  });

  app.get("/api/growth/offer-performance", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getLatestOfferPerformance(100);
    res.json(rows);
  });

  app.post("/api/growth/offer-performance/generate", requireDashboardAuth, async (_req, res) => {
    const { runOfferPerformanceEngine } = await import("./automation/offerPerformanceEngine");
    const result = await runOfferPerformanceEngine();
    res.json({ ok: true, ...result });
  });

  app.get("/api/growth/experiments", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getGrowthExperiments(100);
    res.json(rows);
  });

  app.post("/api/growth/experiments/generate", requireDashboardAuth, async (_req, res) => {
    const { runGrowthExperimentEngine } = await import("./automation/growthExperimentEngine");
    const result = await runGrowthExperimentEngine();
    res.json({ ok: true, ...result });
  });

  app.patch("/api/growth/experiments/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const { updateGrowthExperimentSchema } = await import("@shared/schema");
    const patch = updateGrowthExperimentSchema.parse(req.body);
    const row = await storage.updateGrowthExperiment(id, patch);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.post("/api/growth/offer-overrides/recommend", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getLatestOfferPerformance(20);
    const weak = [...rows].sort((a, b) => a.performanceScore - b.performanceScore).slice(0, 5);
    res.json({
      recommendations: weak.map((x) => ({
        offerSlug: x.offerSlug,
        intent: x.intent,
        sourceName: x.sourceName,
        suggestion: `Consider demoting or retuning ${x.offerSlug} for this segment.`,
        performanceScore: x.performanceScore,
      })),
    });
  });

  app.post("/api/growth/cta-optimization/generate", requireDashboardAuth, async (_req, res) => {
    const leaks = await storage.getLatestFunnelLeaks(5);
    res.json({
      recommendations: leaks.map((x) => ({
        stage: x.leakStage,
        suggestion: `Test stronger CTA placement and copy around ${x.leakStage}.`,
      })),
    });
  });

  app.post("/api/growth/win-loss-analysis/generate", requireDashboardAuth, async (_req, res) => {
    const offers = await storage.getLatestOfferPerformance(20);
    res.json({
      recommendations: offers.slice(0, 5).map((x) => ({
        offerSlug: x.offerSlug,
        closeRate: x.closeRate,
        summary: `Offer ${x.offerSlug} currently closes at ${x.closeRate}% from recommendation.`,
      })),
    });
  });

  // ── Phase 51: Autonomous Execution ───────────────────────────────────────────

  // Policies
  app.get("/api/execution/policies", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getExecutionPolicies();
    res.json(rows);
  });

  app.patch("/api/execution/policies/:key", requireDashboardAuth, async (req, res) => {
    const { updateExecutionPolicySchema } = await import("@shared/schema");
    const patch = updateExecutionPolicySchema.parse(req.body);
    const row = await storage.updateExecutionPolicy(req.params.key, patch);
    if (!row) return res.status(404).json({ message: "Policy not found" });
    res.json(row);
  });

  app.post("/api/execution/policies/seed", requireDashboardAuth, async (_req, res) => {
    await storage.seedDefaultExecutionPolicies();
    const rows = await storage.getExecutionPolicies();
    res.json({ ok: true, count: rows.length, policies: rows });
  });

  // Queue
  app.get("/api/execution/queue", requireDashboardAuth, async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    const rows = await storage.getExecutionQueue(limit);
    res.json(rows);
  });

  app.post("/api/execution/queue/generate", requireDashboardAuth, async (_req, res) => {
    const { runExecutionEngine } = await import("./automation/executionEngine");
    const result = await runExecutionEngine();
    res.json({ ok: true, ...result });
  });

  app.patch("/api/execution/queue/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const { updateExecutionQueueSchema } = await import("@shared/schema");
    const patch = updateExecutionQueueSchema.parse(req.body);
    const row = await storage.updateExecutionQueueItem(id, patch);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // Applied changes
  app.get("/api/execution/applied-changes", requireDashboardAuth, async (req, res) => {
    const limit = Number(req.query.limit) || 100;
    const rows = await storage.getAppliedChanges(limit);
    res.json(rows);
  });

  app.post("/api/execution/apply-now", requireDashboardAuth, async (_req, res) => {
    const { runExecutionEngine } = await import("./automation/executionEngine");
    const result = await runExecutionEngine();
    const changes = await storage.getAppliedChanges(20);
    res.json({ ok: true, ...result, recentChanges: changes.slice(0, 5) });
  });

  app.patch("/api/execution/applied-changes/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const { updateAppliedChangeSchema } = await import("@shared/schema");
    const patch = updateAppliedChangeSchema.parse(req.body);
    const row = await storage.updateAppliedChange(id, patch);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // Rollbacks
  app.get("/api/execution/rollbacks", requireDashboardAuth, async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    const rows = await storage.getRollbackEvents(limit);
    res.json(rows);
  });

  app.post("/api/execution/rollback-check", requireDashboardAuth, async (_req, res) => {
    const { runRollbackEngine } = await import("./automation/rollbackEngine");
    const result = await runRollbackEngine();
    res.json({ ok: true, ...result });
  });

  app.post("/api/execution/rollback/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const change = await storage.updateAppliedChange(id, { status: "rolled_back", rolledBackAt: new Date() });
    if (!change) return res.status(404).json({ message: "Not found" });
    const rollback = await storage.createRollbackEvent({
      appliedChangeId: id,
      reason: "Manual rollback by admin",
      metricsBeforeJson: change.beforeJson as any,
      metricsAfterJson: null,
      status: "completed",
    });
    res.json({ ok: true, change, rollback });
  });

  // Impact evaluation
  app.get("/api/execution/impact/:changeKey", requireDashboardAuth, async (req, res) => {
    const metrics = await storage.getChangeImpactMetrics(req.params.changeKey);
    if (!metrics) return res.status(404).json({ message: "Change not found" });
    res.json(metrics);
  });

  // ── Phase 52: Founder Control, Scale & Maturity ───────────────────────────────

  // Founder command
  app.get("/api/founder/overview", requireDashboardAuth, async (_req, res) => {
    const overview = await storage.getFounderOverview();
    res.json(overview);
  });

  app.get("/api/founder/what-changed-today", requireDashboardAuth, async (_req, res) => {
    const data = await storage.getWhatChangedToday();
    res.json(data);
  });

  app.get("/api/founder/approvals", requireDashboardAuth, async (_req, res) => {
    const [queue, requests] = await Promise.all([
      storage.getExecutionQueue(50),
      storage.getApprovalRequests("pending"),
    ]);
    res.json({
      queuePending: queue.filter((q) => q.status === "pending"),
      approvalRequests: requests,
    });
  });

  app.get("/api/founder/maturity-score", requireDashboardAuth, async (_req, res) => {
    const { computeMaturityScore } = await import("./services/maturityScoring");
    const scores = await computeMaturityScore();
    res.json(scores);
  });

  // Roles
  app.get("/api/admin/roles", requireDashboardAuth, async (_req, res) => {
    const rows = await storage.getUserRoles();
    res.json(rows);
  });

  app.patch("/api/admin/roles/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const { updateUserRoleSchema } = await import("@shared/schema");
    const patch = updateUserRoleSchema.parse(req.body);
    const row = await storage.updateUserRole(id, patch);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.post("/api/admin/roles", requireDashboardAuth, async (req, res) => {
    const { insertUserRoleSchema } = await import("@shared/schema");
    const input = insertUserRoleSchema.parse(req.body);
    const row = await storage.upsertUserRole(input);
    res.json(row);
  });

  // Approval requests
  app.get("/api/founder/approval-requests", requireDashboardAuth, async (req, res) => {
    const status = req.query.status as string | undefined;
    const rows = await storage.getApprovalRequests(status);
    res.json(rows);
  });

  app.patch("/api/founder/approval-requests/:id", requireDashboardAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const { updateApprovalRequestSchema } = await import("@shared/schema");
    const patch = updateApprovalRequestSchema.parse(req.body);
    const resolvedAt = ["approved", "rejected"].includes(patch.status ?? "") ? new Date() : undefined;
    const row = await storage.updateApprovalRequest(id, { ...patch, ...(resolvedAt ? { resolvedAt } : {}) });
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // Explainability
  app.get("/api/explainability/recent", requireDashboardAuth, async (req, res) => {
    const limit = Number(req.query.limit) || 30;
    const rows = await storage.getAiExplanations(undefined, undefined, limit);
    res.json(rows);
  });

  app.get("/api/explainability/:entityType/:entityId", requireDashboardAuth, async (req, res) => {
    const { getExplanationSummary } = await import("./services/explainability");
    const summary = await getExplanationSummary(req.params.entityType, req.params.entityId);
    res.json(summary);
  });

  // System health
  app.get("/api/system/health-summary", requireDashboardAuth, async (_req, res) => {
    const [latest, history] = await Promise.all([
      storage.getLatestHealthSnapshot(),
      storage.getSystemHealthSnapshots(10),
    ]);
    res.json({ latest, history });
  });

  app.post("/api/system/run-health-check", requireDashboardAuth, async (_req, res) => {
    const { runReliabilityWatchdog } = await import("./automation/reliabilityWatchdog");
    const result = await runReliabilityWatchdog();
    res.json({ ok: true, ...result });
  });

  app.post("/api/system/safe-mode", requireDashboardAuth, async (req, res) => {
    const { enabled } = req.body as { enabled: boolean };
    const policies = await storage.getExecutionPolicies();
    for (const p of policies) {
      if (enabled) {
        await storage.updateExecutionPolicy(p.policyKey, { mode: "suggest_only" });
      }
    }
    res.json({ ok: true, safeMode: enabled, policiesUpdated: policies.length });
  });

  app.post("/api/system/kill-switch", requireDashboardAuth, async (_req, res) => {
    const policies = await storage.getExecutionPolicies();
    for (const p of policies) {
      await storage.updateExecutionPolicy(p.policyKey, { isEnabled: false });
    }
    res.json({ ok: true, message: "Kill switch activated — all auto-apply policies disabled", policiesDisabled: policies.length });
  });

  // Quarterly strategy
  app.get("/api/strategy/quarterly/latest", requireDashboardAuth, async (_req, res) => {
    const reports = await storage.getQuarterlyStrategyReports(5);
    res.json(reports[0] ?? null);
  });

  app.get("/api/strategy/quarterly/all", requireDashboardAuth, async (_req, res) => {
    const reports = await storage.getQuarterlyStrategyReports(10);
    res.json(reports);
  });

  app.post("/api/strategy/quarterly/generate", requireDashboardAuth, async (_req, res) => {
    const { runQuarterlyStrategyEngine } = await import("./automation/quarterlyStrategyEngine");
    const result = await runQuarterlyStrategyEngine();
    res.json({ ok: true, ...result });
  });

  return httpServer;
}
