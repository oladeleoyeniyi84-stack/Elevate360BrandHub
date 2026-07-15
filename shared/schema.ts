import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, boolean, jsonb, integer, json, index, uniqueIndex, vector } from "drizzle-orm/pg-core";
// relations imported for future relation definitions
import type {} from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customer accounts (public end-users). Separate from the founder PIN dashboard.
// `username`/`password` are legacy boilerplate columns kept nullable for back-compat;
// customer auth uses `email` + `passwordHash`. (Phase 68A)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique(),
  password: text("password"),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  stripeCustomerId: text("stripe_customer_id"),
  // 'free' | 'starter' | 'pro'
  premiumTier: varchar("premium_tier", { length: 20 }).notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 68A — Stripe subscriptions linked to a customer (users.id).
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  // 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid'
  status: varchar("status", { length: 30 }).notNull().default("incomplete"),
  // plan tier key: 'starter' | 'pro'
  tier: varchar("tier", { length: 20 }).notNull().default("starter"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("subscriptions_user_idx").on(t.userId),
  statusIdx: index("subscriptions_status_idx").on(t.status),
}));

// Phase 68A — AI credit balance (one row per customer). Atomic decrement on use.
export const aiCredits = pgTable("ai_credits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  monthlyAllotment: integer("monthly_allotment").notNull().default(0),
  lastResetAt: timestamp("last_reset_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Phase 68A — entitlement rows: which premium features a customer has access to.
export const userPremiumFeatures = pgTable("user_premium_features", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  featureKey: varchar("feature_key", { length: 80 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  // 'subscription' | 'grant'
  source: varchar("source", { length: 30 }).notNull().default("subscription"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userFeatureIdx: uniqueIndex("user_premium_features_user_feature_idx").on(t.userId, t.featureKey),
}));

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  repliedAt: timestamp("replied_at"),
}, (t) => [
  // Phase 69 — bounded reads order/filter on created_at; created in prod via
  // scripts/create_phase69_indexes.ts (idempotent), NOT db:push.
  index("contact_messages_created_at_idx").on(t.createdAt),
]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
}, (t) => [
  // Phase 69 — see scripts/create_phase69_indexes.ts.
  index("newsletter_subscribers_subscribed_at_idx").on(t.subscribedAt),
]);

// Phase 71.1 — Lead Magnet capture (free guide opt-ins). Public, no auth.
export const leadMagnetLeads = pgTable("lead_magnet_leads", {
  id: serial("id").primaryKey(),
  firstName: text("first_name"),
  email: text("email").notNull(),
  source: varchar("source", { length: 80 }).default("guide-page").notNull(),
  leadScore: integer("lead_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  // Phase 69 — see scripts/create_phase69_indexes.ts.
  index("lead_magnet_leads_created_at_idx").on(t.createdAt),
]);

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

  // Phase 41 — Offer Acceptance Tracking
  recommendedOfferAccepted: boolean("recommended_offer_accepted").default(false),
  acceptedOfferSlug: varchar("accepted_offer_slug", { length: 120 }),
  acceptedOfferSource: varchar("accepted_offer_source", { length: 40 }),

  // Phase 42 — Follow-Up Automation
  lastFollowupSentAt: timestamp("last_followup_sent_at"),
  followupCount: integer("followup_count").default(0).notNull(),
}, (t) => [
  // Phase 69 — bounded/windowed reads order & filter on updated_at; created in
  // prod via scripts/create_phase69_indexes.ts (idempotent), NOT db:push.
  index("chat_conversations_updated_at_idx").on(t.updatedAt),
]);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Phase 68A — customer auth + billing schemas/types
export const customerSignupSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
export const customerLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(200),
});
export type CustomerSignup = z.infer<typeof customerSignupSchema>;
export type CustomerLogin = z.infer<typeof customerLoginSchema>;

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const insertAiCreditsSchema = createInsertSchema(aiCredits).omit({
  id: true,
  updatedAt: true,
});
export type InsertAiCredits = z.infer<typeof insertAiCreditsSchema>;
export type AiCredits = typeof aiCredits.$inferSelect;

export const insertUserPremiumFeatureSchema = createInsertSchema(userPremiumFeatures).omit({
  id: true,
  createdAt: true,
});
export type InsertUserPremiumFeature = z.infer<typeof insertUserPremiumFeatureSchema>;
export type UserPremiumFeature = typeof userPremiumFeatures.$inferSelect;

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

export const insertLeadMagnetLeadSchema = createInsertSchema(leadMagnetLeads, {
  firstName: z.string().max(200).optional(),
  email: z.string().email("Please enter a valid email address"),
  source: z.string().max(80).optional(),
}).pick({
  firstName: true,
  email: true,
  source: true,
});
export type InsertLeadMagnetLead = z.infer<typeof insertLeadMagnetLeadSchema>;
export type LeadMagnetLead = typeof leadMagnetLeads.$inferSelect;

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

// Phase 48 — Automation Settings (key-value config store)
export const automationSettings = pgTable("automation_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type AutomationSetting = typeof automationSettings.$inferSelect;

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
}, (t) => [
  // Phase 69 — see scripts/create_phase69_indexes.ts.
  index("bookings_created_at_idx").on(t.createdAt),
]);

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
  fulfillmentStatus: varchar("fulfillment_status", { length: 40 }).notNull().default("pending"),
  sessionId: varchar("session_id", { length: 64 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Phase 49 — Recovery tracking
  lastRecoveryEvaluatedAt: timestamp("last_recovery_evaluated_at"),
  recoveryStatus: varchar("recovery_status", { length: 30 }).default("none"),
}, (t) => [
  // Phase 69 — bounded/windowed order reads; see scripts/create_phase69_indexes.ts.
  index("orders_created_at_idx").on(t.createdAt),
]);

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
}, (t) => [
  // Bounded analytics reads filter/sort on created_at; created in prod via
  // scripts/create_page_views_index.ts (idempotent), NOT db:push.
  index("page_views_created_at_idx").on(t.createdAt),
]);

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

// AI Content Factory — batch-generated drafts with approval workflow
export const contentDrafts = pgTable("content_drafts", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("blog"), // blog | social | newsletter
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("draft"), // draft | approved | published | rejected
  provider: text("provider").notNull().default("deepseek"),
  publishedPostId: integer("published_post_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContentDraftSchema = createInsertSchema(contentDrafts, {
  kind: z.enum(["blog", "social", "newsletter"]),
  topic: z.string().min(1).max(300),
  title: z.string().min(1).max(300),
  excerpt: z.string().max(1000).optional(),
  body: z.string().min(1),
  category: z.string().max(60).optional(),
  provider: z.string().max(40).optional(),
}).pick({ kind: true, topic: true, title: true, excerpt: true, body: true, category: true, provider: true });

export const updateContentDraftSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  excerpt: z.string().max(1000).optional(),
  body: z.string().min(1).optional(),
  category: z.string().max(60).optional(),
}).strict();

export const generateContentFactorySchema = z.object({
  kind: z.enum(["blog", "social", "newsletter"]).default("blog"),
  topics: z.array(z.string().min(1).max(300)).min(1).max(8),
  premium: z.boolean().optional(),
});

export type InsertContentDraft = z.infer<typeof insertContentDraftSchema>;
export type UpdateContentDraft = z.infer<typeof updateContentDraftSchema>;
export type ContentDraft = typeof contentDrafts.$inferSelect;

// Phase 72 — Content Distribution Engine (Campaigns).
// One published blog fans out into platform-specific assets. Founder-only.
export const CAMPAIGN_ASSET_KEYS = [
  "blog", "linkedin", "facebook", "instagram", "x", "newsletter",
  "email", "podcast", "youtube", "imagePrompt", "videoPrompt", "seo",
] as const;
export type CampaignAssetKey = (typeof CAMPAIGN_ASSET_KEYS)[number];

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  source: text("source").notNull().default("blog"), // blog
  blogPostId: integer("blog_post_id"),
  blogSlug: text("blog_slug"),
  topic: text("topic").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | generating | ready_for_review | approved | published | archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignAssets = pgTable("campaign_assets", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  assetKey: text("asset_key").notNull(),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("empty"), // empty | generated | edited
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  campaignAssetIdx: uniqueIndex("campaign_assets_campaign_asset_idx").on(t.campaignId, t.assetKey),
  campaignIdx: index("campaign_assets_campaign_idx").on(t.campaignId),
}));

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(300),
  blogPostId: z.number().int().positive().optional(),
  blogSlug: z.string().max(200).optional(),
  topic: z.string().max(300).optional(),
  blogContent: z.string().max(100000).optional(),
}).strict();

export const updateCampaignAssetSchema = z.object({
  content: z.string().max(100000),
  status: z.enum(["empty", "generated", "edited"]).optional(),
}).strict();

// Campaign lifecycle states (Phase 4.1). Stored as plain text (no DB enum), so
// expanding this list never requires a migration.
export const CAMPAIGN_STATUSES = [
  "draft", "generating", "ready_for_review", "approved", "published", "archived",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const updateCampaignSchema = z.object({
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  title: z.string().min(1).max(300).optional(),
}).strict().refine((d) => d.status !== undefined || d.title !== undefined, {
  message: "Provide a status or title to update.",
});

export type Campaign = typeof campaigns.$inferSelect;
export type CampaignAsset = typeof campaignAssets.$inferSelect;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignAssetInput = z.infer<typeof updateCampaignAssetSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignWithAssets = Campaign & { assets: CampaignAsset[] };

// Founder Authority Layer — media features, milestones, credentials, awards
export const authorityItems = pgTable("authority_items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("media_feature"), // media_feature | milestone | credential | award | press
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  source: text("source").notNull().default(""), // publication / issuer name
  url: text("url").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  dateLabel: text("date_label").notNull().default(""), // e.g. "Mar 2026"
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAuthorityItemSchema = createInsertSchema(authorityItems, {
  type: z.enum(["media_feature", "milestone", "credential", "award", "press"]),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  source: z.string().max(200).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  dateLabel: z.string().max(60).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
}).pick({ type: true, title: true, description: true, source: true, url: true, imageUrl: true, dateLabel: true, featured: true, sortOrder: true, published: true });

export const updateAuthorityItemSchema = insertAuthorityItemSchema.partial();

export type InsertAuthorityItem = z.infer<typeof insertAuthorityItemSchema>;
export type UpdateAuthorityItem = z.infer<typeof updateAuthorityItemSchema>;
export type AuthorityItem = typeof authorityItems.$inferSelect;

// AI Marketplace — digital products with Stripe checkout + post-purchase delivery
export const marketplaceProducts = pgTable("marketplace_products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("general"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: varchar("currency", { length: 10 }).notNull().default("usd"),
  imageUrl: text("image_url").notNull().default(""),
  stripePriceId: text("stripe_price_id").notNull().default(""), // empty => checkout disabled (coming soon)
  deliveryType: text("delivery_type").notNull().default("link"), // link | content
  deliveryContent: text("delivery_content").notNull().default(""), // download URL or unlocked text
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMarketplaceProductSchema = createInsertSchema(marketplaceProducts, {
  slug: z.string().min(1).max(180).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  category: z.string().max(80).optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().max(10).optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  stripePriceId: z.string().max(200).optional(),
  deliveryType: z.enum(["link", "content"]),
  deliveryContent: z.string().max(8000).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
}).pick({ slug: true, name: true, description: true, category: true, priceCents: true, currency: true, imageUrl: true, stripePriceId: true, deliveryType: true, deliveryContent: true, featured: true, sortOrder: true, published: true });

export const updateMarketplaceProductSchema = insertMarketplaceProductSchema.partial();

export const marketplaceCheckoutSchema = z.object({
  slug: z.string().min(1).max(180),
  customerEmail: z.string().email().optional(),
  sessionId: z.string().max(64).optional(),
});

export type InsertMarketplaceProduct = z.infer<typeof insertMarketplaceProductSchema>;
export type UpdateMarketplaceProduct = z.infer<typeof updateMarketplaceProductSchema>;
export type MarketplaceProduct = typeof marketplaceProducts.$inferSelect;

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
  // Phase 49 — Typed report support
  reportType: varchar("report_type", { length: 40 }).notNull().default("weekly_digest"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  meta: jsonb("meta"),
});

export type DigestReport = typeof digestReports.$inferSelect;

// Phase 43 — Offer Recommendation Optimization
export const offerMappingOverrides = pgTable("offer_mapping_overrides", {
  id: serial("id").primaryKey(),
  intent: varchar("intent", { length: 64 }).notNull().unique(),
  overrideOffer: varchar("override_offer", { length: 200 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 64 }).default("admin"),
});

export type OfferMappingOverride = typeof offerMappingOverrides.$inferSelect;
export const insertOfferMappingOverrideSchema = createInsertSchema(offerMappingOverrides).omit({ id: true, updatedAt: true });
export type InsertOfferMappingOverride = z.infer<typeof insertOfferMappingOverrideSchema>;

// Phase 45 — Reliability & Audit Layer
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorLabel: varchar("actor_label", { length: 64 }).notNull().default("admin"),
  action: varchar("action", { length: 120 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }),
  resourceId: varchar("resource_id", { length: 120 }),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Phase 46 — Internal Audit System
export const auditRuns = pgTable("audit_runs", {
  id: serial("id").primaryKey(),
  auditType: varchar("audit_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("completed"),
  overallVerdict: varchar("overall_verdict", { length: 40 }),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  checksPassed: integer("checks_passed").notNull().default(0),
  checksFailed: integer("checks_failed").notNull().default(0),
  summary: text("summary"),
  createdBy: varchar("created_by", { length: 120 }).default("system"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditChecks = pgTable("audit_checks", {
  id: serial("id").primaryKey(),
  auditRunId: integer("audit_run_id").notNull(),
  checkKey: varchar("check_key", { length: 120 }).notNull(),
  checkGroup: varchar("check_group", { length: 60 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull(),
  expectedValue: text("expected_value"),
  actualValue: text("actual_value"),
  detailsJson: json("details_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditIssues = pgTable("audit_issues", {
  id: serial("id").primaryKey(),
  auditRunId: integer("audit_run_id"),
  issueCode: varchar("issue_code", { length: 40 }).notNull(),
  area: varchar("area", { length: 60 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  expected: text("expected").notNull(),
  actual: text("actual").notNull(),
  suspectedCause: text("suspected_cause"),
  owner: varchar("owner", { length: 120 }),
  status: varchar("status", { length: 30 }).notNull().default("open"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export type AuditRun = typeof auditRuns.$inferSelect;
export type AuditCheck = typeof auditChecks.$inferSelect;
export type AuditIssue = typeof auditIssues.$inferSelect;

export const insertAuditIssueSchema = createInsertSchema(auditIssues).omit({ id: true, createdAt: true, resolvedAt: true });
export type InsertAuditIssue = z.infer<typeof insertAuditIssueSchema>;

export const updateAuditIssueSchema = z.object({
  owner: z.string().max(120).optional(),
  status: z.enum(["open", "investigating", "fixed", "ignored"]).optional(),
  notes: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
});

// ── Phase 49 — Autonomous Operation Layer ────────────────────────────────────

export const automationJobs = pgTable("automation_jobs", {
  id: serial("id").primaryKey(),
  jobKey: varchar("job_key", { length: 80 }).notNull().unique(),
  jobGroup: varchar("job_group", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("idle"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  cadenceMinutes: integer("cadence_minutes"),
  lastStartedAt: timestamp("last_started_at"),
  lastFinishedAt: timestamp("last_finished_at"),
  lastSucceededAt: timestamp("last_succeeded_at"),
  lastFailedAt: timestamp("last_failed_at"),
  lastError: text("last_error"),
  nextRunAt: timestamp("next_run_at"),
  runCount: integer("run_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Phase 53 — DeepSeek QA Sentinel reports
export const qaSentinelReports = pgTable("qa_sentinel_reports", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull(),
  issues: jsonb("issues").notNull().default([]),
  recommendedFixes: jsonb("recommended_fixes").notNull().default([]),
  nextActions: jsonb("next_actions").notNull().default([]),
  confidence: integer("confidence").notNull().default(0),
  rawChecks: jsonb("raw_checks").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQaSentinelReportSchema = createInsertSchema(qaSentinelReports).omit({
  id: true,
  createdAt: true,
});
export type InsertQaSentinelReport = z.infer<typeof insertQaSentinelReportSchema>;
export type QaSentinelReport = typeof qaSentinelReports.$inferSelect;

// Phase 54 — Autonomous Recovery Engine reports
export const recoveryReports = pgTable("recovery_reports", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull(),
  actionsTaken: jsonb("actions_taken").notNull().default([]),
  recommendations: jsonb("recommendations").notNull().default([]),
  skippedActions: jsonb("skipped_actions").notNull().default([]),
  rawContext: jsonb("raw_context").notNull().default({}),
  confidence: integer("confidence").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecoveryReportSchema = createInsertSchema(recoveryReports).omit({
  id: true,
  createdAt: true,
});
export type InsertRecoveryReport = z.infer<typeof insertRecoveryReportSchema>;
export type RecoveryReport = typeof recoveryReports.$inferSelect;

// Phase 56 — Autonomous AI Growth Engine
export const growthIntelligenceReports = pgTable("growth_intelligence_reports", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull(),
  funnel: jsonb("funnel").notNull().default({}),
  trends: jsonb("trends").notNull().default({}),
  forecast: jsonb("forecast").notNull().default({}),
  diagnosticsSummary: text("diagnostics_summary").notNull().default(""),
  executiveSummary: text("executive_summary").notNull().default(""),
  diagnosticsProvider: varchar("diagnostics_provider", { length: 20 }),
  executiveProvider: varchar("executive_provider", { length: 20 }),
  confidence: integer("confidence").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertGrowthIntelligenceReportSchema = createInsertSchema(growthIntelligenceReports).omit({
  id: true,
  createdAt: true,
});
export type InsertGrowthIntelligenceReport = z.infer<typeof insertGrowthIntelligenceReportSchema>;
export type GrowthIntelligenceReport = typeof growthIntelligenceReports.$inferSelect;

export const growthRecommendations = pgTable("growth_recommendations", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => growthIntelligenceReports.id, { onDelete: "set null" }),
  category: varchar("category", { length: 40 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  title: varchar("title", { length: 200 }).notNull(),
  rationale: text("rationale").notNull().default(""),
  proposedExperiment: text("proposed_experiment"),
  expectedImpact: varchar("expected_impact", { length: 120 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  decidedBy: varchar("decided_by", { length: 80 }),
  decidedAt: timestamp("decided_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertGrowthRecommendationSchema = createInsertSchema(growthRecommendations).omit({
  id: true,
  createdAt: true,
  decidedAt: true,
});
export type InsertGrowthRecommendation = z.infer<typeof insertGrowthRecommendationSchema>;
export type GrowthRecommendation = typeof growthRecommendations.$inferSelect;

// Phase 57 — AI Experiment Orchestrator
export const experiments = pgTable("experiments", {
  id: serial("id").primaryKey(),
  experimentKey: varchar("experiment_key", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  hypothesis: text("hypothesis").notNull().default(""),
  surface: varchar("surface", { length: 60 }).notNull().default("generic"),
  targetMetric: varchar("target_metric", { length: 60 }).notNull().default("conversion"),
  variants: jsonb("variants").notNull().default([]),
  trafficAllocation: integer("traffic_allocation").notNull().default(100),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  recommendationId: integer("recommendation_id").references(() => growthRecommendations.id, { onDelete: "set null" }),
  winnerVariantKey: varchar("winner_variant_key", { length: 60 }),
  rollbackReason: text("rollback_reason"),
  decidedBy: varchar("decided_by", { length: 80 }),
  decidedAt: timestamp("decided_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  diagnosticsSummary: text("diagnostics_summary").notNull().default(""),
  executiveSummary: text("executive_summary").notNull().default(""),
  diagnosticsProvider: varchar("diagnostics_provider", { length: 20 }),
  executiveProvider: varchar("executive_provider", { length: 20 }),
  confidence: integer("confidence").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertExperimentSchema = createInsertSchema(experiments).omit({
  id: true, createdAt: true, startedAt: true, completedAt: true, decidedAt: true,
});
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experiments.$inferSelect;

export const experimentAssignments = pgTable("experiment_assignments", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").notNull().references(() => experiments.id, { onDelete: "cascade" }),
  variantKey: varchar("variant_key", { length: 60 }).notNull(),
  subjectKey: varchar("subject_key", { length: 120 }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (t) => ({
  uniqSubject: uniqueIndex("experiment_assignments_experiment_id_subject_key_key").on(t.experimentId, t.subjectKey),
  variantIdx: index("exp_assign_variant_idx").on(t.experimentId, t.variantKey),
}));
export type ExperimentAssignment = typeof experimentAssignments.$inferSelect;

export const experimentEvents = pgTable("experiment_events", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").notNull().references(() => experiments.id, { onDelete: "cascade" }),
  variantKey: varchar("variant_key", { length: 60 }).notNull(),
  subjectKey: varchar("subject_key", { length: 120 }).notNull(),
  eventType: varchar("event_type", { length: 40 }).notNull(),
  value: integer("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  lookupIdx: index("exp_events_lookup_idx").on(t.experimentId, t.variantKey, t.eventType),
}));
export type ExperimentEvent = typeof experimentEvents.$inferSelect;

// Phase 58 — Personalization Engine
export const personalizationSegments = pgTable("personalization_segments", {
  id: serial("id").primaryKey(),
  segmentKey: varchar("segment_key", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  rules: jsonb("rules").notNull().default([]),
  priority: integer("priority").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertPersonalizationSegmentSchema = createInsertSchema(personalizationSegments).omit({ id: true, createdAt: true });
export type InsertPersonalizationSegment = z.infer<typeof insertPersonalizationSegmentSchema>;
export type PersonalizationSegment = typeof personalizationSegments.$inferSelect;

export const personalizationProfiles = pgTable("personalization_profiles", {
  id: serial("id").primaryKey(),
  subjectKey: varchar("subject_key", { length: 120 }).notNull().unique(),
  segmentKey: varchar("segment_key", { length: 80 }).notNull().default("default"),
  behavioralScore: integer("behavioral_score").notNull().default(0),
  intent: varchar("intent", { length: 40 }).notNull().default("unknown"),
  funnelStage: varchar("funnel_stage", { length: 40 }).notNull().default("awareness"),
  signals: jsonb("signals").notNull().default({}),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  segmentIdx: index("personalization_profiles_segment_idx").on(t.segmentKey),
}));
export type PersonalizationProfile = typeof personalizationProfiles.$inferSelect;

export const personalizationRules = pgTable("personalization_rules", {
  id: serial("id").primaryKey(),
  surface: varchar("surface", { length: 60 }).notNull(),
  segmentKey: varchar("segment_key", { length: 80 }).notNull(),
  contentVariant: jsonb("content_variant").notNull().default({}),
  rationale: text("rationale").notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  priority: integer("priority").notNull().default(0),
  decidedBy: varchar("decided_by", { length: 80 }),
  decidedAt: timestamp("decided_at"),
  diagnosticsSummary: text("diagnostics_summary").notNull().default(""),
  executiveSummary: text("executive_summary").notNull().default(""),
  diagnosticsProvider: varchar("diagnostics_provider", { length: 20 }),
  executiveProvider: varchar("executive_provider", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  activeIdx: index("personalization_rules_active_idx").on(t.surface, t.segmentKey, t.status),
  // Partial unique index — at most ONE active rule per (surface, segment). Created via raw SQL.
  oneActiveIdx: uniqueIndex("personalization_rules_one_active_idx").on(t.surface, t.segmentKey).where(sql`status = 'active'`),
}));
export const insertPersonalizationRuleSchema = createInsertSchema(personalizationRules).omit({ id: true, createdAt: true, decidedAt: true });
export type InsertPersonalizationRule = z.infer<typeof insertPersonalizationRuleSchema>;
export type PersonalizationRule = typeof personalizationRules.$inferSelect;

export const personalizationEvents = pgTable("personalization_events", {
  id: serial("id").primaryKey(),
  subjectKey: varchar("subject_key", { length: 120 }).notNull(),
  segmentKey: varchar("segment_key", { length: 80 }).notNull(),
  surface: varchar("surface", { length: 60 }).notNull(),
  ruleId: integer("rule_id").references(() => personalizationRules.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 40 }).notNull(),
  value: integer("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  lookupIdx: index("personalization_events_lookup_idx").on(t.surface, t.segmentKey, t.eventType),
}));
export type PersonalizationEvent = typeof personalizationEvents.$inferSelect;

// Phase 59 — AI Revenue Command Center
export const revenueCommandReports = pgTable("revenue_command_reports", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull().default("ready"),
  revenueSnapshot: jsonb("revenue_snapshot").notNull().default({}),
  growthSnapshot: jsonb("growth_snapshot").notNull().default({}),
  experimentSnapshot: jsonb("experiment_snapshot").notNull().default({}),
  personalizationSnapshot: jsonb("personalization_snapshot").notNull().default({}),
  recommendations: jsonb("recommendations").notNull().default([]),
  executiveSummary: text("executive_summary").notNull().default(""),
  diagnosticsSummary: text("diagnostics_summary").notNull().default(""),
  providerMetadata: jsonb("provider_metadata").notNull().default({}),
  confidence: integer("confidence").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  createdIdx: index("revenue_command_reports_created_idx").on(t.createdAt),
}));
export const insertRevenueCommandReportSchema = createInsertSchema(revenueCommandReports).omit({ id: true, createdAt: true });
export type InsertRevenueCommandReport = z.infer<typeof insertRevenueCommandReportSchema>;
export type RevenueCommandReport = typeof revenueCommandReports.$inferSelect;

export const revenueAlerts = pgTable("revenue_alerts", {
  id: serial("id").primaryKey(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  alertType: varchar("alert_type", { length: 60 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  recommendation: text("recommendation").notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 80 }),
}, (t) => ({
  statusIdx: index("revenue_alerts_status_idx").on(t.status, t.severity, t.createdAt),
  // Partial unique index: at most one OPEN alert per (alert_type, title).
  // Mirrors DB index revenue_alerts_open_dedup_idx. Enforces dedup under concurrency.
  openDedupIdx: uniqueIndex("revenue_alerts_open_dedup_idx").on(t.alertType, t.title).where(sql`status = 'open'`),
}));
export const insertRevenueAlertSchema = createInsertSchema(revenueAlerts).omit({ id: true, createdAt: true, acknowledgedAt: true });
export type InsertRevenueAlert = z.infer<typeof insertRevenueAlertSchema>;
export type RevenueAlert = typeof revenueAlerts.$inferSelect;

// Phase 60 — AI Orchestrator Core
export const orchestratorMemory = pgTable("orchestrator_memory", {
  id: serial("id").primaryKey(),
  memoryType: varchar("memory_type", { length: 40 }).notNull(),
  scope: varchar("scope", { length: 80 }).notNull().default("global"),
  key: varchar("key", { length: 120 }).notNull(),
  value: jsonb("value").notNull().default({}),
  confidence: integer("confidence").notNull().default(50),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  scopeKeyIdx: uniqueIndex("orchestrator_memory_scope_key_idx").on(t.scope, t.key),
  typeIdx: index("orchestrator_memory_type_idx").on(t.memoryType, t.updatedAt),
}));
export const insertOrchestratorMemorySchema = createInsertSchema(orchestratorMemory).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrchestratorMemory = z.infer<typeof insertOrchestratorMemorySchema>;
export type OrchestratorMemory = typeof orchestratorMemory.$inferSelect;

export const orchestratorWorkflows = pgTable("orchestrator_workflows", {
  id: serial("id").primaryKey(),
  workflowKey: varchar("workflow_key", { length: 80 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("queued"),
  priority: integer("priority").notNull().default(50),
  triggeredBy: varchar("triggered_by", { length: 80 }).notNull().default("system"),
  context: jsonb("context").notNull().default({}),
  result: jsonb("result").notNull().default({}),
  governanceDecision: jsonb("governance_decision").notNull().default({}),
  agentTrace: jsonb("agent_trace").notNull().default([]),
  executiveSummary: text("executive_summary").notNull().default(""),
  founderDecision: varchar("founder_decision", { length: 20 }),
  founderDecidedBy: varchar("founder_decided_by", { length: 80 }),
  founderDecidedAt: timestamp("founder_decided_at"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextEligibleAt: timestamp("next_eligible_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  statusIdx: index("orchestrator_workflows_status_idx").on(t.status, t.priority, t.createdAt),
  keyIdx: index("orchestrator_workflows_key_idx").on(t.workflowKey, t.createdAt),
}));
export const insertOrchestratorWorkflowSchema = createInsertSchema(orchestratorWorkflows).omit({ id: true, createdAt: true });
export type InsertOrchestratorWorkflow = z.infer<typeof insertOrchestratorWorkflowSchema>;
export type OrchestratorWorkflow = typeof orchestratorWorkflows.$inferSelect;

export const orchestratorAgentRuns = pgTable("orchestrator_agent_runs", {
  id: serial("id").primaryKey(),
  agentKey: varchar("agent_key", { length: 60 }).notNull(),
  workflowId: integer("workflow_id").references(() => orchestratorWorkflows.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  input: jsonb("input").notNull().default({}),
  output: jsonb("output").notNull().default({}),
  confidence: integer("confidence").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  errorMessage: text("error_message").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  workflowIdx: index("orchestrator_agent_runs_workflow_idx").on(t.workflowId, t.createdAt),
  agentIdx: index("orchestrator_agent_runs_agent_idx").on(t.agentKey, t.createdAt),
}));
export const insertOrchestratorAgentRunSchema = createInsertSchema(orchestratorAgentRuns).omit({ id: true, createdAt: true });
export type InsertOrchestratorAgentRun = z.infer<typeof insertOrchestratorAgentRunSchema>;
export type OrchestratorAgentRun = typeof orchestratorAgentRuns.$inferSelect;

// Phase 61 — Neural Command Grid
export const neuralSignals = pgTable("neural_signals", {
  id: serial("id").primaryKey(),
  signalType: varchar("signal_type", { length: 60 }).notNull(),
  source: varchar("source", { length: 60 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  confidence: integer("confidence").notNull().default(50),
  summary: text("summary").notNull().default(""),
  metadata: jsonb("metadata").notNull().default({}),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  createdIdx: index("neural_signals_created_idx").on(t.createdAt),
  sevStatusIdx: index("neural_signals_sev_status_idx").on(t.severity, t.status, t.createdAt),
  sourceIdx: index("neural_signals_source_idx").on(t.source, t.createdAt),
  openDedup: uniqueIndex("neural_signals_open_dedup_idx").on(t.source, t.signalType)
    .where(sql`status = 'open' AND severity IN ('high','critical')`),
}));
export const insertNeuralSignalSchema = createInsertSchema(neuralSignals).omit({ id: true, createdAt: true });
export type InsertNeuralSignal = z.infer<typeof insertNeuralSignalSchema>;
export type NeuralSignal = typeof neuralSignals.$inferSelect;

export const commandBusEvents = pgTable("command_bus_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 60 }).notNull(),
  source: varchar("source", { length: 60 }).notNull(),
  priority: integer("priority").notNull().default(50),
  payload: jsonb("payload").notNull().default({}),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ createdIdx: index("command_bus_events_created_idx").on(t.createdAt) }));
export const insertCommandBusEventSchema = createInsertSchema(commandBusEvents).omit({ id: true, createdAt: true });
export type InsertCommandBusEvent = z.infer<typeof insertCommandBusEventSchema>;
export type CommandBusEvent = typeof commandBusEvents.$inferSelect;

export const cognitiveStateSnapshots = pgTable("cognitive_state_snapshots", {
  id: serial("id").primaryKey(),
  globalStatus: varchar("global_status", { length: 20 }).notNull().default("unknown"),
  healthScore: integer("health_score").notNull().default(0),
  infrastructureScore: integer("infrastructure_score").notNull().default(0),
  aiScore: integer("ai_score").notNull().default(0),
  revenueScore: integer("revenue_score").notNull().default(0),
  growthScore: integer("growth_score").notNull().default(0),
  orchestrationScore: integer("orchestration_score").notNull().default(0),
  personalizationScore: integer("personalization_score").notNull().default(0),
  experimentScore: integer("experiment_score").notNull().default(0),
  summary: text("summary").notNull().default(""),
  rawState: jsonb("raw_state").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ createdIdx: index("cognitive_state_snapshots_created_idx").on(t.createdAt) }));
export const insertCognitiveStateSnapshotSchema = createInsertSchema(cognitiveStateSnapshots).omit({ id: true, createdAt: true });
export type InsertCognitiveStateSnapshot = z.infer<typeof insertCognitiveStateSnapshotSchema>;
export type CognitiveStateSnapshot = typeof cognitiveStateSnapshots.$inferSelect;

export const executiveEscalations = pgTable("executive_escalations", {
  id: serial("id").primaryKey(),
  severity: varchar("severity", { length: 20 }).notNull().default("high"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  recommendation: text("recommendation").notNull().default(""),
  sourceSignalId: integer("source_signal_id").references(() => neuralSignals.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  requiresFounderAction: boolean("requires_founder_action").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 80 }),
}, (t) => ({
  statusIdx: index("executive_escalations_status_idx").on(t.status, t.severity, t.createdAt),
  openDedup: uniqueIndex("executive_escalations_open_dedup_idx").on(t.title).where(sql`status = 'open'`),
}));
export const insertExecutiveEscalationSchema = createInsertSchema(executiveEscalations).omit({ id: true, createdAt: true, resolvedAt: true });
export type InsertExecutiveEscalation = z.infer<typeof insertExecutiveEscalationSchema>;
export type ExecutiveEscalation = typeof executiveEscalations.$inferSelect;

export const globalHealthScores = pgTable("global_health_scores", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 40 }).notNull(),
  score: integer("score").notNull().default(0),
  trend: varchar("trend", { length: 20 }).notNull().default("flat"),
  explanation: text("explanation").notNull().default(""),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ catIdx: index("global_health_scores_cat_idx").on(t.category, t.createdAt) }));
export const insertGlobalHealthScoreSchema = createInsertSchema(globalHealthScores).omit({ id: true, createdAt: true });
export type InsertGlobalHealthScore = z.infer<typeof insertGlobalHealthScoreSchema>;
export type GlobalHealthScore = typeof globalHealthScores.$inferSelect;

export const insightStreamEntries = pgTable("insight_stream_entries", {
  id: serial("id").primaryKey(),
  insightType: varchar("insight_type", { length: 40 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull().default(""),
  source: varchar("source", { length: 60 }).notNull().default("neural"),
  confidence: integer("confidence").notNull().default(50),
  providerMetadata: jsonb("provider_metadata").notNull().default({}),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ createdIdx: index("insight_stream_entries_created_idx").on(t.createdAt) }));
export const insertInsightStreamEntrySchema = createInsertSchema(insightStreamEntries).omit({ id: true, createdAt: true });
export type InsertInsightStreamEntry = z.infer<typeof insertInsightStreamEntrySchema>;
export type InsightStreamEntry = typeof insightStreamEntries.$inferSelect;

export const workflowDependencies = pgTable("workflow_dependencies", {
  id: serial("id").primaryKey(),
  parentWorkflowKey: varchar("parent_workflow_key", { length: 80 }).notNull(),
  childWorkflowKey: varchar("child_workflow_key", { length: 80 }).notNull(),
  dependencyType: varchar("dependency_type", { length: 40 }).notNull().default("sequence"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ pairIdx: uniqueIndex("workflow_dependencies_pair_idx").on(t.parentWorkflowKey, t.childWorkflowKey, t.dependencyType) }));
export const insertWorkflowDependencySchema = createInsertSchema(workflowDependencies).omit({ id: true, createdAt: true });
export type InsertWorkflowDependency = z.infer<typeof insertWorkflowDependencySchema>;
export type WorkflowDependency = typeof workflowDependencies.$inferSelect;

// ────────────────────────────────────────────────────────────────────────────
// Phase 62 — Autonomous Execution Mesh
// Distributed AI worker layer. Tables are prefixed `mesh_` to avoid collision
// with Phase 49's `execution_queue`. Recommendation-only by contract — every
// mission/task flows through Phase 60 governance before any side effect.
// ────────────────────────────────────────────────────────────────────────────

export const meshAgents = pgTable("mesh_agents", {
  id: serial("id").primaryKey(),
  agentKey: varchar("agent_key", { length: 60 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  specialization: varchar("specialization", { length: 80 }).notNull(),
  provider: varchar("provider", { length: 20 }).notNull().default("deepseek"),
  status: varchar("status", { length: 20 }).notNull().default("idle"),
  maxConcurrency: integer("max_concurrency").notNull().default(1),
  cooldownSeconds: integer("cooldown_seconds").notNull().default(60),
  capabilities: text("capabilities").array().notNull().default(sql`'{}'::text[]`),
  totalRuns: integer("total_runs").notNull().default(0),
  successfulRuns: integer("successful_runs").notNull().default(0),
  failedRuns: integer("failed_runs").notNull().default(0),
  averageLatencyMs: integer("average_latency_ms").notNull().default(0),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
  lastBusyAt: timestamp("last_busy_at"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ statusIdx: index("mesh_agents_status_idx").on(t.status) }));
export const insertMeshAgentSchema = createInsertSchema(meshAgents).omit({ id: true, createdAt: true, totalRuns: true, successfulRuns: true, failedRuns: true, averageLatencyMs: true, lastHeartbeatAt: true, lastBusyAt: true });
export type InsertMeshAgent = z.infer<typeof insertMeshAgentSchema>;
export type MeshAgent = typeof meshAgents.$inferSelect;

export const meshMissions = pgTable("mesh_missions", {
  id: serial("id").primaryKey(),
  missionKey: varchar("mission_key", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  objective: text("objective").notNull().default(""),
  priority: integer("priority").notNull().default(50),
  status: varchar("status", { length: 20 }).notNull().default("queued"),
  assignedAgentId: integer("assigned_agent_id").references(() => meshAgents.id, { onDelete: "set null" }),
  parentMissionId: integer("parent_mission_id"),
  workflowOrigin: varchar("workflow_origin", { length: 80 }),
  executionPlan: jsonb("execution_plan").notNull().default({}),
  missionContext: jsonb("mission_context").notNull().default({}),
  resultSummary: text("result_summary").notNull().default(""),
  confidence: integer("confidence").notNull().default(50),
  attemptCount: integer("attempt_count").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ statusIdx: index("mesh_missions_status_idx").on(t.status, t.priority, t.createdAt) }));
export const insertMeshMissionSchema = createInsertSchema(meshMissions).omit({ id: true, createdAt: true, startedAt: true, completedAt: true, attemptCount: true });
export type InsertMeshMission = z.infer<typeof insertMeshMissionSchema>;
export type MeshMission = typeof meshMissions.$inferSelect;

export const meshTasks = pgTable("mesh_tasks", {
  id: serial("id").primaryKey(),
  missionId: integer("mission_id").notNull().references(() => meshMissions.id, { onDelete: "cascade" }),
  taskKey: varchar("task_key", { length: 80 }).notNull(),
  capability: varchar("capability", { length: 80 }).notNull(),
  assignedAgentId: integer("assigned_agent_id").references(() => meshAgents.id, { onDelete: "set null" }),
  executionOrder: integer("execution_order").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("queued"),
  executionInput: jsonb("execution_input").notNull().default({}),
  executionOutput: jsonb("execution_output").notNull().default({}),
  attemptCount: integer("attempt_count").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  missionIdx: index("mesh_tasks_mission_idx").on(t.missionId, t.executionOrder),
  statusIdx: index("mesh_tasks_status_idx").on(t.status, t.createdAt),
}));
export const insertMeshTaskSchema = createInsertSchema(meshTasks).omit({ id: true, createdAt: true, startedAt: true, completedAt: true, attemptCount: true });
export type InsertMeshTask = z.infer<typeof insertMeshTaskSchema>;
export type MeshTask = typeof meshTasks.$inferSelect;

export const meshCommunications = pgTable("mesh_communications", {
  id: serial("id").primaryKey(),
  fromAgentId: integer("from_agent_id").references(() => meshAgents.id, { onDelete: "set null" }),
  toAgentId: integer("to_agent_id").references(() => meshAgents.id, { onDelete: "set null" }),
  communicationType: varchar("communication_type", { length: 40 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ createdIdx: index("mesh_communications_created_idx").on(t.createdAt) }));
export const insertMeshCommunicationSchema = createInsertSchema(meshCommunications).omit({ id: true, createdAt: true });
export type InsertMeshCommunication = z.infer<typeof insertMeshCommunicationSchema>;
export type MeshCommunication = typeof meshCommunications.$inferSelect;

export const meshQueue = pgTable("mesh_queue", {
  id: serial("id").primaryKey(),
  queueName: varchar("queue_name", { length: 60 }).notNull().default("default"),
  missionId: integer("mission_id").notNull().references(() => meshMissions.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(50),
  scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
  lockedBy: varchar("locked_by", { length: 80 }),
  lockExpiresAt: timestamp("lock_expires_at"),
  status: varchar("status", { length: 20 }).notNull().default("queued"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  activeMissionIdx: uniqueIndex("mesh_queue_active_mission_idx").on(t.missionId).where(sql`status IN ('queued','locked')`),
  dispatchIdx: index("mesh_queue_dispatch_idx").on(t.status, t.scheduledFor, t.priority),
}));
export const insertMeshQueueSchema = createInsertSchema(meshQueue).omit({ id: true, createdAt: true, lockedBy: true, lockExpiresAt: true });
export type InsertMeshQueueItem = z.infer<typeof insertMeshQueueSchema>;
export type MeshQueueItem = typeof meshQueue.$inferSelect;

export const meshTopologySnapshots = pgTable("mesh_topology_snapshots", {
  id: serial("id").primaryKey(),
  activeAgents: integer("active_agents").notNull().default(0),
  runningMissions: integer("running_missions").notNull().default(0),
  queuedMissions: integer("queued_missions").notNull().default(0),
  failedMissions: integer("failed_missions").notNull().default(0),
  meshHealthScore: integer("mesh_health_score").notNull().default(0),
  topology: jsonb("topology").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ createdIdx: index("mesh_topology_created_idx").on(t.createdAt) }));
export const insertMeshTopologySnapshotSchema = createInsertSchema(meshTopologySnapshots).omit({ id: true, createdAt: true });
export type InsertMeshTopologySnapshot = z.infer<typeof insertMeshTopologySnapshotSchema>;
export type MeshTopologySnapshot = typeof meshTopologySnapshots.$inferSelect;

export const meshWorkerMemory = pgTable("mesh_worker_memory", {
  id: serial("id").primaryKey(),
  agentKey: varchar("agent_key", { length: 60 }).notNull(),
  memoryScope: varchar("memory_scope", { length: 60 }).notNull(),
  memoryKey: varchar("memory_key", { length: 120 }).notNull(),
  memoryValue: jsonb("memory_value").notNull().default({}),
  confidence: integer("confidence").notNull().default(50),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  agentScopeKey: uniqueIndex("mesh_worker_memory_unique").on(t.agentKey, t.memoryScope, t.memoryKey),
  agentIdx: index("mesh_worker_memory_agent_idx").on(t.agentKey, t.memoryScope),
}));
export const insertMeshWorkerMemorySchema = createInsertSchema(meshWorkerMemory).omit({ id: true, createdAt: true });
export type InsertMeshWorkerMemory = z.infer<typeof insertMeshWorkerMemorySchema>;
export type MeshWorkerMemory = typeof meshWorkerMemory.$inferSelect;

export const meshAuditLogs = pgTable("mesh_audit_logs", {
  id: serial("id").primaryKey(),
  missionId: integer("mission_id").references(() => meshMissions.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 60 }).notNull(),
  summary: text("summary").notNull().default(""),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ missionIdx: index("mesh_audit_mission_idx").on(t.missionId, t.createdAt) }));
export const insertMeshAuditLogSchema = createInsertSchema(meshAuditLogs).omit({ id: true, createdAt: true });
export type InsertMeshAuditLog = z.infer<typeof insertMeshAuditLogSchema>;
export type MeshAuditLog = typeof meshAuditLogs.$inferSelect;

export type ExperimentVariant = {
  key: string;
  name: string;
  description?: string;
  weight: number; // 0..100, weights across variants should sum to 100
  isControl?: boolean;
  config?: Record<string, any>;
};

export const automationJobLogs = pgTable("automation_job_logs", {
  id: serial("id").primaryKey(),
  jobKey: varchar("job_key", { length: 80 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  summary: text("summary"),
  meta: jsonb("meta"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const revenueRecoveryActions = pgTable("revenue_recovery_actions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }),
  orderId: integer("order_id"),
  recoveryType: varchar("recovery_type", { length: 40 }).notNull(),
  priorityScore: integer("priority_score").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("open"),
  recommendedAction: text("recommended_action"),
  draftSubject: text("draft_subject"),
  draftBody: text("draft_body"),
  targetEmail: text("target_email"),
  targetPhone: text("target_phone"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  actedAt: timestamp("acted_at"),
});

export const contentOpportunities = pgTable("content_opportunities", {
  id: serial("id").primaryKey(),
  topic: varchar("topic", { length: 240 }).notNull(),
  contentType: varchar("content_type", { length: 40 }).notNull(),
  sourceIntent: varchar("source_intent", { length: 80 }),
  opportunityScore: integer("opportunity_score").notNull().default(0),
  evidenceJson: jsonb("evidence_json"),
  recommendation: text("recommendation"),
  status: varchar("status", { length: 30 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const autonomousAlerts = pgTable("autonomous_alerts", {
  id: serial("id").primaryKey(),
  alertKey: varchar("alert_key", { length: 120 }).notNull(),
  area: varchar("area", { length: 60 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  summary: text("summary").notNull(),
  suggestedFix: text("suggested_fix"),
  autoFixEligible: boolean("auto_fix_eligible").notNull().default(false),
  status: varchar("status", { length: 30 }).notNull().default("open"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Zod schemas
export const insertAutomationJobSchema = createInsertSchema(automationJobs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutomationJob = z.infer<typeof insertAutomationJobSchema>;
export type AutomationJob = typeof automationJobs.$inferSelect;

export const insertAutomationJobLogSchema = createInsertSchema(automationJobLogs).omit({ id: true, startedAt: true });
export type InsertAutomationJobLog = z.infer<typeof insertAutomationJobLogSchema>;
export type AutomationJobLog = typeof automationJobLogs.$inferSelect;

export const insertRevenueRecoveryActionSchema = createInsertSchema(revenueRecoveryActions).omit({ id: true, createdAt: true, updatedAt: true, actedAt: true });
export const updateRevenueRecoveryActionSchema = insertRevenueRecoveryActionSchema.partial();
export type InsertRevenueRecoveryAction = z.infer<typeof insertRevenueRecoveryActionSchema>;
export type UpdateRevenueRecoveryAction = z.infer<typeof updateRevenueRecoveryActionSchema>;
export type RevenueRecoveryAction = typeof revenueRecoveryActions.$inferSelect;

export const insertContentOpportunitySchema = createInsertSchema(contentOpportunities).omit({ id: true, createdAt: true, updatedAt: true });
export const updateContentOpportunitySchema = insertContentOpportunitySchema.partial();
export type InsertContentOpportunity = z.infer<typeof insertContentOpportunitySchema>;
export type UpdateContentOpportunity = z.infer<typeof updateContentOpportunitySchema>;
export type ContentOpportunity = typeof contentOpportunities.$inferSelect;

export const insertAutonomousAlertSchema = createInsertSchema(autonomousAlerts).omit({ id: true, createdAt: true, resolvedAt: true });
export const updateAutonomousAlertSchema = insertAutonomousAlertSchema.partial();
export type InsertAutonomousAlert = z.infer<typeof insertAutonomousAlertSchema>;
export type UpdateAutonomousAlert = z.infer<typeof updateAutonomousAlertSchema>;
export type AutonomousAlert = typeof autonomousAlerts.$inferSelect;

// ─── Phase 50: Growth Optimization ─────────────────────────────────────────

export const growthExperiments = pgTable("growth_experiments", {
  id: serial("id").primaryKey(),
  experimentKey: varchar("experiment_key", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 240 }).notNull(),
  area: varchar("area", { length: 40 }).notNull(),
  hypothesis: text("hypothesis").notNull(),
  proposedChange: text("proposed_change").notNull(),
  evidenceJson: jsonb("evidence_json"),
  expectedImpactScore: integer("expected_impact_score").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("proposed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const sourcePerformanceSnapshots = pgTable("source_performance_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: timestamp("snapshot_date").defaultNow().notNull(),
  sourceName: varchar("source_name", { length: 120 }).notNull(),
  visits: integer("visits").notNull().default(0),
  chatLeads: integer("chat_leads").notNull().default(0),
  qualifiedLeads: integer("qualified_leads").notNull().default(0),
  bookings: integer("bookings").notNull().default(0),
  paidOrders: integer("paid_orders").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
  avgOrderValue: integer("avg_order_value").notNull().default(0),
  recoveryWinRate: integer("recovery_win_rate").notNull().default(0),
  qualityScore: integer("quality_score").notNull().default(0),
});

export const funnelLeakReports = pgTable("funnel_leak_reports", {
  id: serial("id").primaryKey(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  leakStage: varchar("leak_stage", { length: 80 }).notNull(),
  severityScore: integer("severity_score").notNull().default(0),
  dropoffCount: integer("dropoff_count").notNull().default(0),
  dropoffRate: integer("dropoff_rate").notNull().default(0),
  suspectedCausesJson: jsonb("suspected_causes_json"),
  recommendedFix: text("recommended_fix"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const offerPerformanceSnapshots = pgTable("offer_performance_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: timestamp("snapshot_date").defaultNow().notNull(),
  offerSlug: varchar("offer_slug", { length: 120 }).notNull(),
  intent: varchar("intent", { length: 80 }),
  sourceName: varchar("source_name", { length: 120 }),
  recommendedCount: integer("recommended_count").notNull().default(0),
  acceptedCount: integer("accepted_count").notNull().default(0),
  paidCount: integer("paid_count").notNull().default(0),
  acceptanceRate: integer("acceptance_rate").notNull().default(0),
  closeRate: integer("close_rate").notNull().default(0),
  avgOrderValue: integer("avg_order_value").notNull().default(0),
  performanceScore: integer("performance_score").notNull().default(0),
});

// ── Phase 51: Autonomous Execution ──────────────────────────────────────────

export const executionPolicies = pgTable("execution_policies", {
  id: serial("id").primaryKey(),
  policyKey: varchar("policy_key", { length: 120 }).notNull().unique(),
  area: varchar("area", { length: 40 }).notNull(),
  mode: varchar("mode", { length: 30 }).notNull().default("suggest_only"),
  minConfidence: integer("min_confidence").notNull().default(70),
  maxRiskScore: integer("max_risk_score").notNull().default(30),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appliedChanges = pgTable("applied_changes", {
  id: serial("id").primaryKey(),
  changeKey: varchar("change_key", { length: 180 }).notNull().unique(),
  area: varchar("area", { length: 40 }).notNull(),
  targetType: varchar("target_type", { length: 80 }),
  targetId: varchar("target_id", { length: 120 }),
  changeType: varchar("change_type", { length: 80 }).notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  reason: text("reason"),
  evidenceJson: jsonb("evidence_json"),
  confidence: integer("confidence").notNull().default(0),
  riskScore: integer("risk_score").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("proposed"),
  appliedBy: varchar("applied_by", { length: 30 }).notNull().default("ai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  appliedAt: timestamp("applied_at"),
  rolledBackAt: timestamp("rolled_back_at"),
});

export const executionQueue = pgTable("execution_queue", {
  id: serial("id").primaryKey(),
  queueKey: varchar("queue_key", { length: 180 }).notNull().unique(),
  area: varchar("area", { length: 40 }).notNull(),
  actionType: varchar("action_type", { length: 80 }).notNull(),
  payloadJson: jsonb("payload_json"),
  priorityScore: integer("priority_score").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  executedAt: timestamp("executed_at"),
});

export const rollbackEvents = pgTable("rollback_events", {
  id: serial("id").primaryKey(),
  appliedChangeId: integer("applied_change_id").notNull(),
  reason: text("reason"),
  metricsBeforeJson: jsonb("metrics_before_json"),
  metricsAfterJson: jsonb("metrics_after_json"),
  status: varchar("status", { length: 30 }).notNull().default("triggered"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExecutionPolicySchema = createInsertSchema(executionPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const updateExecutionPolicySchema = insertExecutionPolicySchema.partial();
export type InsertExecutionPolicy = z.infer<typeof insertExecutionPolicySchema>;
export type UpdateExecutionPolicy = z.infer<typeof updateExecutionPolicySchema>;
export type ExecutionPolicy = typeof executionPolicies.$inferSelect;

export const insertAppliedChangeSchema = createInsertSchema(appliedChanges).omit({ id: true, createdAt: true, rolledBackAt: true });
export const updateAppliedChangeSchema = createInsertSchema(appliedChanges).omit({ id: true, createdAt: true }).partial();
export type InsertAppliedChange = z.infer<typeof insertAppliedChangeSchema>;
export type UpdateAppliedChange = z.infer<typeof updateAppliedChangeSchema>;
export type AppliedChange = typeof appliedChanges.$inferSelect;

export const insertExecutionQueueSchema = createInsertSchema(executionQueue).omit({ id: true, createdAt: true, executedAt: true });
export const updateExecutionQueueSchema = insertExecutionQueueSchema.partial();
export type InsertExecutionQueueItem = z.infer<typeof insertExecutionQueueSchema>;
export type UpdateExecutionQueueItem = z.infer<typeof updateExecutionQueueSchema>;
export type ExecutionQueueItem = typeof executionQueue.$inferSelect;

export const insertRollbackEventSchema = createInsertSchema(rollbackEvents).omit({ id: true, createdAt: true });
export type InsertRollbackEvent = z.infer<typeof insertRollbackEventSchema>;
export type RollbackEvent = typeof rollbackEvents.$inferSelect;

export const insertGrowthExperimentSchema = createInsertSchema(growthExperiments).omit({ id: true, createdAt: true, startedAt: true, completedAt: true });
export const updateGrowthExperimentSchema = createInsertSchema(growthExperiments).omit({ id: true, createdAt: true }).partial();
export type InsertGrowthExperiment = z.infer<typeof insertGrowthExperimentSchema>;
export type UpdateGrowthExperiment = z.infer<typeof updateGrowthExperimentSchema>;
export type GrowthExperiment = typeof growthExperiments.$inferSelect;

export const insertSourcePerformanceSnapshotSchema = createInsertSchema(sourcePerformanceSnapshots).omit({ id: true, snapshotDate: true });
export type InsertSourcePerformanceSnapshot = z.infer<typeof insertSourcePerformanceSnapshotSchema>;
export type SourcePerformanceSnapshot = typeof sourcePerformanceSnapshots.$inferSelect;

export const insertFunnelLeakReportSchema = createInsertSchema(funnelLeakReports).omit({ id: true, createdAt: true });
export type InsertFunnelLeakReport = z.infer<typeof insertFunnelLeakReportSchema>;
export type FunnelLeakReport = typeof funnelLeakReports.$inferSelect;

export const insertOfferPerformanceSnapshotSchema = createInsertSchema(offerPerformanceSnapshots).omit({ id: true, snapshotDate: true });
export type InsertOfferPerformanceSnapshot = z.infer<typeof insertOfferPerformanceSnapshotSchema>;
export type OfferPerformanceSnapshot = typeof offerPerformanceSnapshots.$inferSelect;

// ── Phase 52: Founder Control, Scale & Maturity ───────────────────────────────

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 40 }).notNull().default("analyst"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const approvalRequests = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  requestKey: varchar("request_key", { length: 180 }).notNull().unique(),
  area: varchar("area", { length: 40 }).notNull(),
  actionType: varchar("action_type", { length: 80 }).notNull(),
  payloadJson: jsonb("payload_json"),
  requestedBy: varchar("requested_by", { length: 80 }).notNull().default("ai"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const aiExplanations = pgTable("ai_explanations", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 120 }).notNull(),
  actionType: varchar("action_type", { length: 80 }).notNull(),
  reason: text("reason"),
  evidenceJson: jsonb("evidence_json"),
  confidence: integer("confidence").notNull().default(0),
  policyKey: varchar("policy_key", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemHealthSnapshots = pgTable("system_health_snapshots", {
  id: serial("id").primaryKey(),
  snapshotTime: timestamp("snapshot_time").defaultNow().notNull(),
  jobHealthScore: integer("job_health_score").notNull().default(0),
  revenueTruthScore: integer("revenue_truth_score").notNull().default(0),
  auditHealthScore: integer("audit_health_score").notNull().default(0),
  executionSafetyScore: integer("execution_safety_score").notNull().default(0),
  growthHealthScore: integer("growth_health_score").notNull().default(0),
  overallMaturityScore: integer("overall_maturity_score").notNull().default(0),
  metaJson: jsonb("meta_json"),
});

export const quarterlyStrategyReports = pgTable("quarterly_strategy_reports", {
  id: serial("id").primaryKey(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  summary: text("summary"),
  recommendationsJson: jsonb("recommendations_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export const updateUserRoleSchema = insertUserRoleSchema.partial();
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({ id: true, createdAt: true, resolvedAt: true });
export const updateApprovalRequestSchema = insertApprovalRequestSchema.partial();
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;

export const insertAiExplanationSchema = createInsertSchema(aiExplanations).omit({ id: true, createdAt: true });
export type InsertAiExplanation = z.infer<typeof insertAiExplanationSchema>;
export type AiExplanation = typeof aiExplanations.$inferSelect;

export const insertSystemHealthSnapshotSchema = createInsertSchema(systemHealthSnapshots).omit({ id: true, snapshotTime: true });
export type InsertSystemHealthSnapshot = z.infer<typeof insertSystemHealthSnapshotSchema>;
export type SystemHealthSnapshot = typeof systemHealthSnapshots.$inferSelect;

export const insertQuarterlyStrategyReportSchema = createInsertSchema(quarterlyStrategyReports).omit({ id: true, createdAt: true });
export type InsertQuarterlyStrategyReport = z.infer<typeof insertQuarterlyStrategyReportSchema>;
export type QuarterlyStrategyReport = typeof quarterlyStrategyReports.$inferSelect;

// Phase 63 — Cognitive Memory Layer (pgvector semantic memory)
export const cognitiveMemories = pgTable("cognitive_memories", {
  id: serial("id").primaryKey(),
  // 'conversation' | 'lead' | 'founder' | 'agent' | 'brand_knowledge'
  memoryScope: varchar("memory_scope", { length: 40 }).notNull(),
  // 'short_term' | 'long_term' | 'episodic' | 'strategic'
  memoryType: varchar("memory_type", { length: 20 }).notNull().default("long_term"),
  // sessionId, lead key, agent_key, 'founder', 'brand'
  subjectKey: varchar("subject_key", { length: 120 }).notNull(),
  title: varchar("title", { length: 200 }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  importance: integer("importance").notNull().default(50),
  source: varchar("source", { length: 60 }).notNull().default("system"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  accessCount: integer("access_count").notNull().default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  scopeSubjectIdx: index("cognitive_memories_scope_subject_idx").on(t.memoryScope, t.subjectKey),
  typeIdx: index("cognitive_memories_type_idx").on(t.memoryType),
}));

export const insertCognitiveMemorySchema = createInsertSchema(cognitiveMemories).omit({
  id: true,
  embedding: true,
  accessCount: true,
  lastAccessedAt: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCognitiveMemorySchema = insertCognitiveMemorySchema.partial();
export type InsertCognitiveMemory = z.infer<typeof insertCognitiveMemorySchema>;
export type CognitiveMemory = typeof cognitiveMemories.$inferSelect;

// ─── Phase 64 — Founder Intelligence System ──────────────────────────────────
// AI executive reports (daily / weekly / monthly / quarterly). Recommendation-only.
export const founderIntelReports = pgTable("founder_intel_reports", {
  id: serial("id").primaryKey(),
  // 'daily' | 'weekly' | 'monthly' | 'quarterly'
  periodType: varchar("period_type", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary").notNull(),
  // structured sections: { revenue, growth, experiments, personalization, aiOps, forecasts, opportunities, risks, actions }
  sections: jsonb("sections").notNull().default(sql`'{}'::jsonb`),
  providerMetadata: jsonb("provider_metadata").notNull().default(sql`'{}'::jsonb`),
  source: varchar("source", { length: 40 }).notNull().default("openai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  periodIdx: index("founder_intel_reports_period_idx").on(t.periodType),
  createdIdx: index("founder_intel_reports_created_idx").on(t.createdAt),
}));

export const insertFounderIntelReportSchema = createInsertSchema(founderIntelReports).omit({
  id: true,
  createdAt: true,
});
export type InsertFounderIntelReport = z.infer<typeof insertFounderIntelReportSchema>;
export type FounderIntelReport = typeof founderIntelReports.$inferSelect;

// Founder Decision Center items: opportunities / risks / recommended actions.
export const founderDecisionItems = pgTable("founder_decision_items", {
  id: serial("id").primaryKey(),
  // 'opportunity' | 'risk' | 'action'
  kind: varchar("kind", { length: 20 }).notNull(),
  // 'revenue' | 'growth' | 'experiments' | 'personalization' | 'concierge' | 'memory' | 'execution' | 'ai_ops'
  area: varchar("area", { length: 40 }).notNull().default("general"),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail").notNull(),
  priority: integer("priority").notNull().default(50),
  confidence: integer("confidence").notNull().default(50),
  // 'open' | 'acknowledged' | 'dismissed'
  status: varchar("status", { length: 20 }).notNull().default("open"),
  source: varchar("source", { length: 40 }).notNull().default("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  kindIdx: index("founder_decision_items_kind_idx").on(t.kind),
  statusIdx: index("founder_decision_items_status_idx").on(t.status),
}));

export const insertFounderDecisionItemSchema = createInsertSchema(founderDecisionItems).omit({
  id: true,
  createdAt: true,
});
export type InsertFounderDecisionItem = z.infer<typeof insertFounderDecisionItemSchema>;
export type FounderDecisionItem = typeof founderDecisionItems.$inferSelect;

// ─── Phase 65 — Revenue Intelligence Engine ──────────────────────────────────
// Executive revenue intelligence reports (daily/weekly/monthly/quarterly).
// OpenAI executive synthesis over a scrubbed cross-system revenue snapshot.
export const revenueIntelReports = pgTable("revenue_intel_reports", {
  id: serial("id").primaryKey(),
  // 'daily' | 'weekly' | 'monthly' | 'quarterly'
  periodType: varchar("period_type", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary").notNull(),
  // structured sections: { revenue, attribution, clv, offers, funnel, bookings, forecasts, opportunities, risks, actions }
  sections: jsonb("sections").notNull().default(sql`'{}'::jsonb`),
  providerMetadata: jsonb("provider_metadata").notNull().default(sql`'{}'::jsonb`),
  source: varchar("source", { length: 40 }).notNull().default("openai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  periodIdx: index("revenue_intel_reports_period_idx").on(t.periodType),
  createdIdx: index("revenue_intel_reports_created_idx").on(t.createdAt),
}));

export const insertRevenueIntelReportSchema = createInsertSchema(revenueIntelReports).omit({
  id: true,
  createdAt: true,
});
export type InsertRevenueIntelReport = z.infer<typeof insertRevenueIntelReportSchema>;
export type RevenueIntelReport = typeof revenueIntelReports.$inferSelect;

// Revenue intelligence insights: opportunities / risks / recommended actions.
export const revenueInsights = pgTable("revenue_insights", {
  id: serial("id").primaryKey(),
  // 'opportunity' | 'risk' | 'action'
  kind: varchar("kind", { length: 20 }).notNull(),
  // 'attribution' | 'clv' | 'offers' | 'funnel' | 'bookings' | 'forecast' | 'stripe' | 'leads' | 'general'
  area: varchar("area", { length: 40 }).notNull().default("general"),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail").notNull(),
  priority: integer("priority").notNull().default(50),
  confidence: integer("confidence").notNull().default(50),
  // 'open' | 'acknowledged' | 'dismissed'
  status: varchar("status", { length: 20 }).notNull().default("open"),
  source: varchar("source", { length: 40 }).notNull().default("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  kindIdx: index("revenue_insights_kind_idx").on(t.kind),
  statusIdx: index("revenue_insights_status_idx").on(t.status),
}));

export const insertRevenueInsightSchema = createInsertSchema(revenueInsights).omit({
  id: true,
  createdAt: true,
});
export type InsertRevenueInsight = z.infer<typeof insertRevenueInsightSchema>;
export type RevenueInsight = typeof revenueInsights.$inferSelect;

// ── Phase 66 — Growth Automation Engine ──────────────────────────────────────
// Recommendation-only growth layer. Tables are `growth_auto_*` prefixed to avoid
// collision with the existing growthIntelligenceReports / growthRecommendations /
// growthExperiments tables.

// Discovered growth opportunities: SEO / content / campaign / lead / conversion / social.
export const growthAutoOpportunities = pgTable("growth_auto_opportunities", {
  id: serial("id").primaryKey(),
  // 'seo' | 'content' | 'campaign' | 'lead' | 'conversion' | 'social' | 'general'
  kind: varchar("kind", { length: 20 }).notNull().default("general"),
  // 'seo' | 'content' | 'campaign' | 'leads' | 'funnel' | 'social' | 'traffic' | 'forecast' | 'general'
  area: varchar("area", { length: 40 }).notNull().default("general"),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail").notNull(),
  priority: integer("priority").notNull().default(50),
  confidence: integer("confidence").notNull().default(50),
  // 'open' | 'acknowledged' | 'dismissed'
  status: varchar("status", { length: 20 }).notNull().default("open"),
  // 'rules' | 'forecast'
  source: varchar("source", { length: 40 }).notNull().default("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  kindIdx: index("growth_auto_opps_kind_idx").on(t.kind),
  statusIdx: index("growth_auto_opps_status_idx").on(t.status),
}));

export const insertGrowthAutoOpportunitySchema = createInsertSchema(growthAutoOpportunities).omit({
  id: true,
  createdAt: true,
});
export type InsertGrowthAutoOpportunity = z.infer<typeof insertGrowthAutoOpportunitySchema>;
export type GrowthAutoOpportunity = typeof growthAutoOpportunities.$inferSelect;

// Planned campaigns + social publishing workflows. Recommendation-only — "approved"
// means the founder OK'd it; nothing is auto-published. approvalRequestId links to
// the existing founder approvalRequests record created on approval.
export const growthAutoCampaigns = pgTable("growth_auto_campaigns", {
  id: serial("id").primaryKey(),
  campaignKey: varchar("campaign_key", { length: 180 }).notNull().unique(),
  // 'blog' | 'instagram' | 'youtube' | 'email' | 'etsy' | 'audiomack' | 'multi'
  channel: varchar("channel", { length: 30 }).notNull().default("multi"),
  objective: varchar("objective", { length: 200 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  // structured plan: { summary, audience, steps[], schedule[], copy[], kpis[] } (social drafts add { posts[] })
  plan: jsonb("plan").notNull().default(sql`'{}'::jsonb`),
  providerMetadata: jsonb("provider_metadata").notNull().default(sql`'{}'::jsonb`),
  // 'draft' | 'pending_approval' | 'approved' | 'rejected'
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  approvalRequestId: integer("approval_request_id"),
  // 'campaign' | 'social'
  source: varchar("source", { length: 40 }).notNull().default("campaign"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
}, (t) => ({
  statusIdx: index("growth_auto_campaigns_status_idx").on(t.status),
  channelIdx: index("growth_auto_campaigns_channel_idx").on(t.channel),
}));

export const insertGrowthAutoCampaignSchema = createInsertSchema(growthAutoCampaigns).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});
export type InsertGrowthAutoCampaign = z.infer<typeof insertGrowthAutoCampaignSchema>;
export type GrowthAutoCampaign = typeof growthAutoCampaigns.$inferSelect;

// Executive growth reports (daily / weekly / monthly / quarterly).
export const growthAutoReports = pgTable("growth_auto_reports", {
  id: serial("id").primaryKey(),
  periodType: varchar("period_type", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary").notNull(),
  // structured sections: { traffic, leadScoring, seo, content, campaigns, funnel, forecast, opportunities, risks, actions }
  sections: jsonb("sections").notNull().default(sql`'{}'::jsonb`),
  providerMetadata: jsonb("provider_metadata").notNull().default(sql`'{}'::jsonb`),
  source: varchar("source", { length: 40 }).notNull().default("openai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  periodIdx: index("growth_auto_reports_period_idx").on(t.periodType),
  createdIdx: index("growth_auto_reports_created_idx").on(t.createdAt),
}));

export const insertGrowthAutoReportSchema = createInsertSchema(growthAutoReports).omit({
  id: true,
  createdAt: true,
});
export type InsertGrowthAutoReport = z.infer<typeof insertGrowthAutoReportSchema>;
export type GrowthAutoReport = typeof growthAutoReports.$inferSelect;

// ── Phase 67 — Cognitive Operating System ────────────────────────────────────
// Recommendation-only meta-layer. Unifies the open signals emitted by the
// existing intelligence engines (Founder Intelligence decision items, Revenue
// Intelligence insights, Growth Automation opportunities) into one prioritized
// cognitive layer: unified decisions, cross-system conflict detection, and an
// executive cognitive briefing. Never mutates money / pricing / email / infra /
// secrets and never executes anything autonomously.

// Unified cross-system decisions distilled from many subsystem signals.
export const cognitiveDecisions = pgTable("cognitive_decisions", {
  id: serial("id").primaryKey(),
  // 'opportunity' | 'risk' | 'action'
  kind: varchar("kind", { length: 20 }).notNull().default("action"),
  // 'revenue' | 'growth' | 'pipeline' | 'experiments' | 'personalization' | 'ai_ops' | 'general'
  area: varchar("area", { length: 40 }).notNull().default("general"),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail").notNull(),
  priority: integer("priority").notNull().default(50),
  confidence: integer("confidence").notNull().default(50),
  // contributing signal refs: [{ system, area, title }]
  sources: jsonb("sources").notNull().default(sql`'[]'::jsonb`),
  // 'open' | 'acknowledged' | 'dismissed'
  status: varchar("status", { length: 20 }).notNull().default("open"),
  // 'rules' | 'deepseek'
  source: varchar("source", { length: 40 }).notNull().default("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  kindIdx: index("cognitive_decisions_kind_idx").on(t.kind),
  statusIdx: index("cognitive_decisions_status_idx").on(t.status),
}));

export const insertCognitiveDecisionSchema = createInsertSchema(cognitiveDecisions).omit({
  id: true,
  createdAt: true,
});
export type InsertCognitiveDecision = z.infer<typeof insertCognitiveDecisionSchema>;
export type CognitiveDecision = typeof cognitiveDecisions.$inferSelect;

// Executive cognitive briefings (daily / weekly / monthly / quarterly).
export const cognitiveBriefings = pgTable("cognitive_briefings", {
  id: serial("id").primaryKey(),
  periodType: varchar("period_type", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary").notNull(),
  // structured sections: { signals, decisions, conflicts, systems }
  sections: jsonb("sections").notNull().default(sql`'{}'::jsonb`),
  providerMetadata: jsonb("provider_metadata").notNull().default(sql`'{}'::jsonb`),
  source: varchar("source", { length: 40 }).notNull().default("openai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  periodIdx: index("cognitive_briefings_period_idx").on(t.periodType),
  createdIdx: index("cognitive_briefings_created_idx").on(t.createdAt),
}));

export const insertCognitiveBriefingSchema = createInsertSchema(cognitiveBriefings).omit({
  id: true,
  createdAt: true,
});
export type InsertCognitiveBriefing = z.infer<typeof insertCognitiveBriefingSchema>;
export type CognitiveBriefing = typeof cognitiveBriefings.$inferSelect;

// Detected contradictions between signals from different subsystems
// (e.g. growth pushing expansion while revenue is trending down).
export const cognitiveConflicts = pgTable("cognitive_conflicts", {
  id: serial("id").primaryKey(),
  area: varchar("area", { length: 40 }).notNull().default("general"),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail").notNull(),
  severity: integer("severity").notNull().default(50),
  leftSignal: text("left_signal").notNull().default(""),
  rightSignal: text("right_signal").notNull().default(""),
  // 'open' | 'acknowledged' | 'resolved'
  status: varchar("status", { length: 20 }).notNull().default("open"),
  source: varchar("source", { length: 40 }).notNull().default("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  areaIdx: index("cognitive_conflicts_area_idx").on(t.area),
  statusIdx: index("cognitive_conflicts_status_idx").on(t.status),
}));

export const insertCognitiveConflictSchema = createInsertSchema(cognitiveConflicts).omit({
  id: true,
  createdAt: true,
});
export type InsertCognitiveConflict = z.infer<typeof insertCognitiveConflictSchema>;
export type CognitiveConflict = typeof cognitiveConflicts.$inferSelect;
