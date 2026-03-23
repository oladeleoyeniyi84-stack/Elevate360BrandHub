import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  repliedAt: timestamp("replied_at"),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull().unique(),
  messages: jsonb("messages").notNull().default(sql`'[]'::jsonb`),
  leadName: text("lead_name"),
  leadEmail: text("lead_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages, {
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(1, "Message is required").max(5000),
}).pick({
  name: true,
  email: true,
  message: true,
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers, {
  email: z.string().email("Please enter a valid email address"),
}).pick({
  email: true,
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  sessionId: z.string().min(1).max(64),
  message: z.string().min(1).max(2000),
  leadName: z.string().optional(),
  leadEmail: z.string().email().optional(),
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clickEvents = pgTable("click_events", {
  id: serial("id").primaryKey(),
  product: text("product").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClickEventSchema = createInsertSchema(clickEvents).pick({
  product: true,
  label: true,
});

export type InsertClickEvent = z.infer<typeof insertClickEventSchema>;
export type ClickEvent = typeof clickEvents.$inferSelect;

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle"),
  rating: integer("rating").notNull().default(5),
  body: text("body").notNull(),
  product: text("product").notNull(),
  approved: boolean("approved").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials, {
  name: z.string().min(1, "Name required").max(100),
  rating: z.number().int().min(1).max(5).default(5),
  body: z.string().min(1, "Review text required").max(1000),
  product: z.string().min(1, "Product required").max(100),
  handle: z.string().max(80).optional(),
}).pick({ name: true, handle: true, rating: true, body: true, product: true });

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
