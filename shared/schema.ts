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

  // Phase 33 — Intent Router
  intent: varchar("intent", { length: 80 }),
  intentConfidence: integer("intent_confidence").default(0),
  routeTarget: varchar("route_target", { length: 80 }),
  requiresFollowup: boolean("requires_followup").default(false).notNull(),
  capturedEmail: varchar("captured_email", { length: 180 }),
  capturedName: varchar("captured_name", { length: 160 }),

  // Phase 34 — Lead Scoring
  leadScore: integer("lead_score").default(0),
  leadTemperature: varchar("lead_temperature", { length: 20 }).default("cold").notNull(),
  scoreReasoning: text("score_reasoning"),
  nextAction: varchar("next_action", { length: 120 }),
  assignedStage: varchar("assigned_stage", { length: 40 }).default("new").notNull(),
  lastActivityAt: timestamp("last_activity_at"),

  // Phase 38 — AI Conversation Summaries
  sessionSummary: text("session_summary"),
  leadQuality: varchar("lead_quality", { length: 20 }),
  recommendedFollowup: text("recommended_followup"),
  ctaShown: varchar("cta_shown", { length: 120 }),
  conversionOutcome: varchar("conversion_outcome", { length: 80 }),

  // Phase 40 — CRM Pipeline
  pipelineStage: varchar("pipeline_stage", { length: 40 }).default("new").notNull(),
  followupDueDate: timestamp("followup_due_date"),
  wonValue: integer("won_value"),
  lostReason: text("lost_reason"),
  stageHistory: jsonb("stage_history").default(sql`'[]'::jsonb`).notNull(),

  // Phase 39 — Recommended Offer layer
  recommendedOffer: varchar("recommended_offer", { length: 120 }),
  recommendedOfferConfidence: integer("recommended_offer_confidence").default(0),
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

// Phase 36 — Consultation Offerings
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull().default(60),
  price: integer("price").notNull().default(0),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConsultationSchema = createInsertSchema(consultations, {
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  duration: z.number().int().min(15).max(480).default(60),
  price: z.number().int().min(0).default(0),
  currency: z.string().max(10).default("USD"),
  sortOrder: z.number().int().default(0),
}).pick({ title: true, description: true, duration: true, price: true, currency: true, isActive: true, sortOrder: true });

export const updateConsultationSchema = insertConsultationSchema.partial();

export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type UpdateConsultation = z.infer<typeof updateConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;

// Phase 36 — Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }),
  consultationId: integer("consultation_id"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  preferredDate: varchar("preferred_date", { length: 100 }),
  message: text("message"),
  status: varchar("status", { length: 40 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings, {
  clientName: z.string().min(1, "Name required").max(200),
  clientEmail: z.string().email("Valid email required"),
  preferredDate: z.string().max(100).optional(),
  message: z.string().max(2000).optional(),
  sessionId: z.string().max(64).optional(),
  consultationId: z.number().int().positive().optional(),
}).pick({ sessionId: true, consultationId: true, clientName: true, clientEmail: true, preferredDate: true, message: true });

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Phase 37 — Orders (Stripe Checkout fulfillment)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  productName: text("product_name"),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  amountPaid: integer("amount_paid"),
  currency: varchar("currency", { length: 10 }).default("usd"),
  status: varchar("status", { length: 40 }).notNull().default("initiated"),
  sessionId: varchar("session_id", { length: 64 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;

// Phase 35 — Knowledge Base
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("general"),
  content: text("content").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKnowledgeDocSchema = createInsertSchema(knowledgeDocuments, {
  title: z.string().min(1, "Title required").max(200),
  category: z.string().min(1).max(80),
  content: z.string().min(1, "Content required"),
  priority: z.number().int().min(0).max(100).optional(),
}).pick({ title: true, category: true, content: true, isPublished: true, priority: true });

export const updateKnowledgeDocSchema = insertKnowledgeDocSchema.partial();

export type InsertKnowledgeDoc = z.infer<typeof insertKnowledgeDocSchema>;
export type UpdateKnowledgeDoc = z.infer<typeof updateKnowledgeDocSchema>;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;

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

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts, {
  title: z.string().min(1, "Title required").max(300),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  excerpt: z.string().min(1, "Excerpt required").max(500),
  body: z.string().min(1, "Body required"),
  category: z.string().max(60).optional(),
}).pick({ title: true, slug: true, excerpt: true, body: true, category: true });

export const updateBlogPostSchema = insertBlogPostSchema.partial();

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type UpdateBlogPost = z.infer<typeof updateBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Phase 39 — Weekly Intelligence Digest
export const digestReports = pgTable("digest_reports", {
  id: serial("id").primaryKey(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  narrative: text("narrative").notNull(),
  topIntents: jsonb("top_intents").default(sql`'[]'::jsonb`).notNull(),
  hotLeadsCount: integer("hot_leads_count").default(0).notNull(),
  qualifiedCount: integer("qualified_count").default(0).notNull(),
  bookedCount: integer("booked_count").default(0).notNull(),
  wonValue: integer("won_value").default(0).notNull(),
  followupsDue: integer("followups_due").default(0).notNull(),
  unansweredHotLeads: integer("unanswered_hot_leads").default(0).notNull(),
  topRecommendedOffer: text("top_recommended_offer"),
  knowledgeBackedChats: integer("knowledge_backed_chats").default(0).notNull(),
  supportPatterns: text("support_patterns"),
  contentOpportunities: text("content_opportunities"),
  conversionByIntent: jsonb("conversion_by_intent").default(sql`'{}'::jsonb`).notNull(),
  emailSentAt: timestamp("email_sent_at"),
});

export type DigestReport = typeof digestReports.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
