import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertContactMessageSchema,
  insertNewsletterSubscriberSchema,
  chatRequestSchema,
  insertTestimonialSchema,
  insertBlogPostSchema,
  updateBlogPostSchema,
  type ChatMessage,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getConciergeReply, generateBrandCopy, type ContentType } from "./openai";
import { processConversationIntelligence, applyStageAutomation } from "./services/leadService";
import { generateAndSaveDigest } from "./ai/digestGenerator";
import { notifyNewContact, notifyNewLead, notifyNewSubscriber, sendContactReply, sendDigestEmail, notifyNewBooking } from "./email";
import { generateSitemap } from "./sitemap";
import { z } from "zod";
import { WebhookHandlers } from "./webhookHandlers";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { sql, eq, desc } from "drizzle-orm";
import { auditRuns, auditChecks, auditIssues, insertAuditIssueSchema, updateAuditIssueSchema, updateRevenueRecoveryActionSchema, updateContentOpportunitySchema, updateAutonomousAlertSchema } from "@shared/schema";
import { runAudit } from "./services/auditService";
import { runRevenueRecoveryEngine } from "./automation/revenueRecoveryEngine";
import { runContentOpportunityEngine } from "./automation/contentOpportunityEngine";
import { generateFounderWeeklyBrief, generateMonthlyStrategyBrief } from "./automation/executiveDigestEngine";
import { runAnomalyEngine } from "./automation/anomalyEngine";

const DASHBOARD_PIN = process.env.DASHBOARD_PIN;

function isDashboardAuthed(req: any): boolean {
  return req.session?.dashboardAuthed === true;
}

function requireDashboardAuth(req: any, res: any, next: any) {
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

      const conversation = await storage.getOrCreateChatSession(sessionId);
      const history = (conversation.messages as ChatMessage[]) ?? [];

      const [knowledgeDocs, activeConsultations] = await Promise.all([
        storage.getPublishedKnowledgeByIntent(null).catch(() => []),
        storage.getConsultations(true).catch(() => []),
      ]);
      // Phase 39 — inject recommended offer for this session into concierge
      const reply = await getConciergeReply(history, message, knowledgeDocs, activeConsultations, conversation.recommendedOffer);

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

      res.json({ reply });
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

  // Phase 37 — Stripe Webhook (uses req.rawBody captured by express.json verify callback)
  app.post("/api/stripe/webhook", async (req: any, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).json({ error: "Missing stripe-signature" });
    try {
      const rawBody = req.rawBody as Buffer;
      await WebhookHandlers.processWebhook(rawBody, Array.isArray(sig) ? sig[0] : sig);

      // Custom fulfillment: parse event and update our orders table
      try {
        const event = JSON.parse(rawBody.toString());
        if (event.type === "checkout.session.completed") {
          const session = event.data?.object;
          if (session?.id) {
            await storage.updateOrderStatus(session.id, "paid", {
              stripePaymentIntentId: session.payment_intent ?? undefined,
              amountPaid: session.amount_total ?? undefined,
              customerName: session.customer_details?.name ?? undefined,
            });
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
      } catch {}

      res.json({ received: true });
    } catch (e: any) {
      console.error("[stripe] webhook error:", e.message);
      res.status(400).json({ error: "Webhook processing error" });
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

  // Phase 37 — Public Offers (fetched from Stripe synced data)
  app.get("/api/offers", async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.description AS product_description,
          p.metadata AS product_metadata,
          pr.id AS price_id,
          pr.unit_amount,
          pr.currency
        FROM stripe.products p
        JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY (p.metadata->>'displayOrder')::int ASC NULLS LAST, p.name ASC
      `);
      const offers = result.rows.map((row: any) => ({
        productId: row.product_id,
        priceId: row.price_id,
        name: row.product_name,
        description: row.product_description,
        amount: row.unit_amount,
        currency: row.currency ?? "usd",
        metadata: row.product_metadata ?? {},
      }));
      res.json(offers);
    } catch {
      res.json([]); // stripe schema may not exist yet
    }
  });

  // Phase 37 — Create Stripe Checkout Session
  app.post("/api/checkout/session", async (req, res) => {
    const { priceId, customerEmail, sessionId: chatSessionId, productName, amount } = req.body;
    if (!priceId) return res.status(400).json({ message: "priceId required" });

    const origin = `https://${(process.env.REPLIT_DOMAINS ?? "localhost:5000").split(",")[0]}`;

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
      res.status(500).json({ message: "Could not create checkout session." });
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

    // OpenAI env var
    checks.openai = { ok: !!process.env.OPENAI_API_KEY, detail: process.env.OPENAI_API_KEY ? "key present" : "OPENAI_API_KEY missing" };

    // Resend env var
    checks.resend = { ok: !!process.env.RESEND_API_KEY, detail: process.env.RESEND_API_KEY ? "key present" : "RESEND_API_KEY missing" };

    // Stripe connectivity (via integration connector)
    try {
      const stripeClient = await getUncachableStripeClient();
      checks.stripe = { ok: !!stripeClient, detail: stripeClient ? "connected" : "no key" };
    } catch {
      checks.stripe = { ok: false, detail: "connector unavailable" };
    }

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
