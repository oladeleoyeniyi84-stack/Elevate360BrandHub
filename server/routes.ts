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
import { notifyNewContact, notifyNewLead, notifyNewSubscriber, sendContactReply, sendDigestEmail, notifyNewBooking } from "./email";
import { generateSitemap } from "./sitemap";
import { processConversationIntelligence } from "./services/leadService";
import { z } from "zod";

const DASHBOARD_PIN = process.env.DASHBOARD_PIN;

function isDashboardAuthed(req: any): boolean {
  return req.session?.dashboardAuthed === true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/sitemap.xml", (_req, res) => {
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=86400");
    res.send(generateSitemap());
  });

  app.post("/api/contact", async (req, res) => {
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

  app.post("/api/newsletter", async (req, res) => {
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

  app.post("/api/chat", async (req, res) => {
    try {
      const { sessionId, message, leadName, leadEmail } = chatRequestSchema.parse(req.body);

      const conversation = await storage.getOrCreateChatSession(sessionId);
      const history = (conversation.messages as ChatMessage[]) ?? [];

      const [knowledgeDocs, activeConsultations] = await Promise.all([
        storage.getPublishedKnowledgeByIntent(null).catch(() => []),
        storage.getConsultations(true).catch(() => []),
      ]);
      const reply = await getConciergeReply(history, message, knowledgeDocs, activeConsultations);

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
      return res.json({ ok: true });
    }
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
    await storage.updateLeadPipelineStage(
      sessionId,
      stage,
      note,
      wonValue !== undefined ? Number(wonValue) : undefined,
      lostReason,
      followupDueDate ? new Date(followupDueDate) : undefined
    );
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

  app.get("/api/config/public", (_req, res) => {
    res.json({
      whatsappNumber: process.env.WHATSAPP_NUMBER || null,
      announcementText: process.env.ANNOUNCEMENT_TEXT || null,
      announcementUrl: process.env.ANNOUNCEMENT_URL || null,
    });
  });

  return httpServer;
}
