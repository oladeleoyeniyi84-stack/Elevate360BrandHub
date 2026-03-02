import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactMessageSchema, insertNewsletterSubscriberSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/contact", async (req, res) => {
    try {
      const data = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(data);
      res.status(201).json(message);
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

  return httpServer;
}