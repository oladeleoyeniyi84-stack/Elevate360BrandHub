import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertContactMessageSchema,
  insertNewsletterSubscriberSchema,
  chatRequestSchema,
  type ChatMessage,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getConciergeReply, generateBrandCopy, type ContentType } from "./openai";
import { notifyNewContact, notifyNewLead, notifyNewSubscriber, sendContactReply } from "./email";
import { generateSitemap } from "./sitemap";
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

      const reply = await getConciergeReply(history, message);

      await storage.appendChatMessage(sessionId, { role: "user", content: message });
      await storage.appendChatMessage(sessionId, { role: "assistant", content: reply });

      if (leadName || leadEmail) {
        await storage.updateChatLead(sessionId, leadName, leadEmail);
        if (leadEmail) {
          notifyNewLead(sessionId, leadName, leadEmail).catch(() => {});
        }
      }

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
    const leads = await storage.getAllChatConversations();
    res.json(leads);
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

  app.get("/api/config/public", (_req, res) => {
    res.json({
      whatsappNumber: process.env.WHATSAPP_NUMBER || null,
      announcementText: process.env.ANNOUNCEMENT_TEXT || null,
      announcementUrl: process.env.ANNOUNCEMENT_URL || null,
    });
  });

  return httpServer;
}
