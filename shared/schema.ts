import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, boolean, jsonb, integer, json } from "drizzle-orm/pg-core";
// relations imported for future relation definitions
import type {} from "drizzle-orm";
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

  // Phase 41 — Offer Acceptance Tracking
  recommendedOfferAccepted: boolean("recommended_offer_accepted").default(false),
  acceptedOfferSlug: varchar("accepted_offer_slug", { length: 120 }),
  acceptedOfferSource: varchar("accepted_offer_source", { length: 40 }),

  // Phase 42 — Follow-Up Automation
  lastFollowupSentAt: timestamp("last_followup_sent_at"),
  followupCount: integer("followup_count").default(0).notNull(),
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
  fulfillmentStatus: varchar("fulfillment_status", { length: 40 }).notNull().default("pending"),
  sessionId: varchar("session_id", { length: 64 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Phase 49 — Recovery tracking
  lastRecoveryEvaluatedAt: timestamp("last_recovery_evaluated_at"),
  recoveryStatus: varchar("recovery_status", { length: 30 }).default("none"),
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
