import {
  type User, type InsertUser,
  type ContactMessage, type InsertContactMessage,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type ChatConversation, type ChatMessage,
  type Testimonial, type InsertTestimonial,
  type BlogPost, type InsertBlogPost, type UpdateBlogPost,
  type KnowledgeDocument, type InsertKnowledgeDoc, type UpdateKnowledgeDoc,
  type Consultation, type InsertConsultation, type UpdateConsultation,
  type Booking, type InsertBooking,
  type Order,
  type DigestReport,
  type OfferMappingOverride,
  type AuditLog, type InsertAuditLog,
  type AutomationJob, type InsertAutomationJob,
  type AutomationJobLog, type InsertAutomationJobLog,
  type RevenueRecoveryAction, type InsertRevenueRecoveryAction, type UpdateRevenueRecoveryAction,
  type ContentOpportunity, type InsertContentOpportunity, type UpdateContentOpportunity,
  type AutonomousAlert, type InsertAutonomousAlert, type UpdateAutonomousAlert,
  type GrowthExperiment, type InsertGrowthExperiment, type UpdateGrowthExperiment,
  type SourcePerformanceSnapshot, type InsertSourcePerformanceSnapshot,
  type FunnelLeakReport, type InsertFunnelLeakReport,
  type OfferPerformanceSnapshot, type InsertOfferPerformanceSnapshot,
  type ExecutionPolicy, type InsertExecutionPolicy, type UpdateExecutionPolicy,
  type AppliedChange, type InsertAppliedChange, type UpdateAppliedChange,
  type ExecutionQueueItem, type InsertExecutionQueueItem, type UpdateExecutionQueueItem,
  type RollbackEvent, type InsertRollbackEvent,
  type UserRole, type InsertUserRole,
  type ApprovalRequest, type InsertApprovalRequest,
  type AiExplanation, type InsertAiExplanation,
  type SystemHealthSnapshot, type InsertSystemHealthSnapshot,
  type QuarterlyStrategyReport, type InsertQuarterlyStrategyReport,
  users, contactMessages, newsletterSubscribers, chatConversations, clickEvents, pageViews, testimonials, blogPosts, knowledgeDocuments, consultations, bookings, orders, digestReports, offerMappingOverrides, auditLogs, automationSettings,
  automationJobs, automationJobLogs, revenueRecoveryActions, contentOpportunities, autonomousAlerts,
  growthExperiments, sourcePerformanceSnapshots, funnelLeakReports, offerPerformanceSnapshots,
  executionPolicies, appliedChanges, executionQueue, rollbackEvents,
  userRoles, approvalRequests, aiExplanations, systemHealthSnapshots, quarterlyStrategyReports,
} from "@shared/schema";
import { db } from "./db";
import { and, asc, count, desc, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  replyContactMessage(id: number): Promise<ContactMessage | undefined>;
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getOrCreateChatSession(sessionId: string): Promise<ChatConversation>;
  appendChatMessage(sessionId: string, message: ChatMessage): Promise<void>;
  updateChatLead(sessionId: string, name?: string, email?: string): Promise<void>;
  getChatConversation(sessionId: string): Promise<ChatConversation | undefined>;
  getAllChatConversations(temperature?: string): Promise<ChatConversation[]>;
  updateChatIntelligence(sessionId: string, data: Partial<ChatConversation>): Promise<void>;
  getChatSession(sessionId: string): Promise<ChatConversation | undefined>;
  updateChatSummary(sessionId: string, data: {
    sessionSummary?: string;
    leadQuality?: string;
    recommendedFollowup?: string;
    ctaShown?: string;
    conversionOutcome?: string;
  }): Promise<void>;
  markLeadConverted(sessionId: string): Promise<void>;
  recordPageView(page: string): Promise<void>;
  getPageViews(): Promise<{ createdAt: Date }[]>;
  recordClick(product: string, label: string): Promise<void>;
  getClickStats(): Promise<{ product: string; label: string; count: number }[]>;
  getTestimonials(all?: boolean): Promise<Testimonial[]>;
  createTestimonial(t: InsertTestimonial): Promise<Testimonial>;
  deleteTestimonial(id: number): Promise<void>;
  toggleTestimonialApproval(id: number): Promise<Testimonial | undefined>;
  getBlogPosts(publishedOnly?: boolean): Promise<BlogPost[]>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, updates: UpdateBlogPost): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<void>;
  toggleBlogPostPublished(id: number): Promise<BlogPost | undefined>;
  // Phase 35 — Knowledge Base
  getKnowledgeDocs(publishedOnly?: boolean): Promise<KnowledgeDocument[]>;
  getPublishedKnowledgeByIntent(intent?: string | null): Promise<KnowledgeDocument[]>;
  createKnowledgeDoc(doc: InsertKnowledgeDoc): Promise<KnowledgeDocument>;
  updateKnowledgeDoc(id: number, updates: UpdateKnowledgeDoc): Promise<KnowledgeDocument | undefined>;
  deleteKnowledgeDoc(id: number): Promise<void>;
  toggleKnowledgeDocPublished(id: number): Promise<KnowledgeDocument | undefined>;
  // Phase 40 — CRM Pipeline
  updateLeadPipelineStage(sessionId: string, stage: string, note?: string, wonValue?: number, lostReason?: string, followupDueDate?: Date | null): Promise<void>;
  getLeadsByPipelineStage(stage?: string): Promise<ChatConversation[]>;
  // Phase 36 — Consultations
  getConsultations(activeOnly?: boolean): Promise<Consultation[]>;
  getConsultation(id: number): Promise<Consultation | undefined>;
  createConsultation(data: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: number, data: UpdateConsultation): Promise<Consultation | undefined>;
  deleteConsultation(id: number): Promise<void>;
  toggleConsultationActive(id: number): Promise<Consultation | undefined>;
  seedDefaultConsultations(): Promise<void>;
  // Phase 36 — Bookings
  createBooking(data: InsertBooking): Promise<Booking>;
  getAllBookings(): Promise<(Booking & { consultationTitle?: string })[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<void>;
  // Phase 37 — Orders
  createOrder(data: any): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByStripeSession(stripeSessionId: string): Promise<Order | undefined>;
  updateOrderStatus(stripeSessionId: string, status: string, extra?: any): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrderStats(): Promise<{ total: number; paid: number; revenue: number; abandoned: number }>;
  // Phase 45 — Reliability & Audit Layer
  createAuditLog(entry: Omit<InsertAuditLog, "actorLabel"> & { actorLabel?: string }): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getSystemHealthSummary(): Promise<{ lastLeadAt: Date | null; lastDigestAt: Date | null; totalLeads: number; totalPaidOrders: number; totalAuditActions: number }>;

  // Phase 44 — Revenue Attribution Dashboard
  getRevenueAttributionData(): Promise<{
    monthlySeries: { month: string; stripeRevenue: number; wonRevenue: number; total: number }[];
    byOffer: { name: string; revenue: number; count: number; avgValue: number }[];
    byIntent: { intent: string; revenue: number; count: number }[];
    bySource: { source: string; revenue: number; count: number }[];
    topPaths: { intent: string; offer: string; revenue: number; count: number }[];
    totals: { stripeRevenue: number; wonRevenue: number; combinedRevenue: number; paidOrders: number; wonDeals: number; avgOrderValue: number };
  }>;
  // Phase 43 — Offer Recommendation Optimization
  getOfferMappingOverrides(): Promise<OfferMappingOverride[]>;
  setOfferMappingOverride(intent: string, offer: string): Promise<OfferMappingOverride>;
  removeOfferMappingOverride(intent: string): Promise<void>;
  toggleOfferMappingOverride(intent: string, isActive: boolean): Promise<void>;
  getOfferOptimizerData(): Promise<{
    perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }>;
    perIntent: Record<string, { recommended: number; accepted: number; acceptanceRate: number; topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null }>;
  }>;
  // Phase 42 — Follow-Up Automation
  markFollowupSent(sessionId: string, newDueDate: Date): Promise<void>;
  getReminderQueue(): Promise<{ overdue: ChatConversation[]; silentHot: ChatConversation[] }>;
  // Phase 41 — Conversion Analytics
  markOfferAccepted(sessionId: string, offerSlug: string, source: string): Promise<void>;
  getConversionFunnel(): Promise<{
    totalSessions: number; withIntent: number; emailCaptured: number;
    qualified: number; booked: number; paidOrders: number;
    stages: { name: string; count: number; rate: number }[];
  }>;
  getConversionAnalytics(): Promise<{
    byIntent: Record<string, { total: number; qualified: number; qualifiedRate: number; booked: number; bookedRate: number; won: number; wonRate: number; offered: number; accepted: number; offerAcceptanceRate: number }>;
    offerAcceptance: Record<string, { timesRecommended: number; timesAccepted: number; acceptanceRate: number; bySource: Record<string, number> }>;
    byConsultation: Record<string, { title: string; total: number; confirmed: number; confirmRate: number }>;
  }>;
  getUrgencyDashboard(): Promise<{
    overdueHotLeads: number; newQualifiedLeads: number; pendingBookings: number;
    paidOrdersToday: number; unrepliedContacts: number; topRecommendedOffer: string | null;
  }>;
  // Phase 39 — Digest + Intelligence
  saveDigestReport(data: {
    weekStart: Date; weekEnd: Date; narrative: string;
    topIntents: any; hotLeadsCount: number; qualifiedCount: number;
    bookedCount: number; wonValue: number; followupsDue: number;
    unansweredHotLeads: number; topRecommendedOffer: string | null;
    knowledgeBackedChats: number; supportPatterns: string | null;
    contentOpportunities: string | null; conversionByIntent: any;
  }): Promise<DigestReport>;
  getLatestDigest(): Promise<DigestReport | null>;
  getAllDigests(): Promise<DigestReport[]>;
  getDashboardIntelligence(): Promise<{
    qualifiedCount: number;
    bookedThisWeek: number;
    wonThisMonth: number;
    overdueFollowups: number;
    topRecommendedOffer: string | null;
    knowledgeBackedChats: number;
    conversionByIntent: Record<string, { total: number; won: number; rate: number }>;
    overdueLeads: { sessionId: string; leadName: string | null; leadEmail: string | null; intent: string | null; followupDueDate: Date | null }[];
  }>;
  getDashboardSummary(): Promise<{
    leads: { total: number; emailCaptured: number; hot: number; qualified: number; bookedThisWeek: number; wonThisMonth: number };
    revenue: { totalPaid: number; paidOrders: number; avgOrderValue: number; abandoned: number };
    engagement: { newsletterSubscribers: number; contactForms: number; unrepliedContacts: number; pendingBookings: number };
    topIntent: string | null;
    topRecommendedOffer: string | null;
    generatedAt: string;
  }>;
  getAutomationSetting(key: string): Promise<string | null>;
  setAutomationSetting(key: string, value: string): Promise<void>;

  // Phase 49 — Automation Jobs
  getAutomationJobs(): Promise<AutomationJob[]>;
  upsertAutomationJob(jobKey: string, patch: Partial<InsertAutomationJob>): Promise<AutomationJob>;
  createAutomationJobLog(input: InsertAutomationJobLog): Promise<void>;
  getAutomationJobLogs(jobKey: string, limit?: number): Promise<AutomationJobLog[]>;

  // Phase 49 — Revenue Recovery
  getRevenueRecoveryActions(limit?: number): Promise<RevenueRecoveryAction[]>;
  createRevenueRecoveryAction(input: InsertRevenueRecoveryAction): Promise<RevenueRecoveryAction>;
  updateRevenueRecoveryAction(id: number, patch: UpdateRevenueRecoveryAction): Promise<RevenueRecoveryAction | undefined>;
  listAcceptedButUnpaidSessions(): Promise<any[]>;
  listAbandonedCheckoutOrders(hoursSinceCreated?: number): Promise<any[]>;
  listStaleFulfillmentOrders(hoursStale?: number): Promise<any[]>;

  // Phase 49 — Content Opportunities
  getContentOpportunities(limit?: number): Promise<ContentOpportunity[]>;
  createContentOpportunity(input: InsertContentOpportunity): Promise<ContentOpportunity>;
  updateContentOpportunity(id: number, patch: UpdateContentOpportunity): Promise<ContentOpportunity | undefined>;

  // Phase 49 — Executive Digests
  getLatestDigestByType(reportType: string): Promise<any | undefined>;
  createDigestReportTyped(input: any): Promise<any>;

  // Phase 49 — Autonomous Alerts
  getAutonomousAlerts(limit?: number): Promise<AutonomousAlert[]>;
  createAutonomousAlert(input: InsertAutonomousAlert): Promise<AutonomousAlert>;
  updateAutonomousAlert(id: number, patch: UpdateAutonomousAlert): Promise<AutonomousAlert | undefined>;

  // Phase 50 — Growth Optimization
  getGrowthExperiments(limit?: number): Promise<GrowthExperiment[]>;
  createGrowthExperiment(input: InsertGrowthExperiment): Promise<GrowthExperiment>;
  updateGrowthExperiment(id: number, patch: UpdateGrowthExperiment): Promise<GrowthExperiment | undefined>;
  getLatestSourcePerformance(limit?: number): Promise<SourcePerformanceSnapshot[]>;
  createSourcePerformanceSnapshot(input: InsertSourcePerformanceSnapshot): Promise<SourcePerformanceSnapshot>;
  getLatestFunnelLeaks(limit?: number): Promise<FunnelLeakReport[]>;
  createFunnelLeakReport(input: InsertFunnelLeakReport): Promise<FunnelLeakReport>;
  getLatestOfferPerformance(limit?: number): Promise<OfferPerformanceSnapshot[]>;
  createOfferPerformanceSnapshot(input: InsertOfferPerformanceSnapshot): Promise<OfferPerformanceSnapshot>;
  getSourcePerformanceCandidates(periodDays?: number): Promise<any[]>;
  getOfferPerformanceCandidates(periodDays?: number): Promise<any[]>;
  getFunnelLeakCandidates(periodDays?: number): Promise<any>;

  // Phase 51 — Autonomous Execution
  getExecutionPolicies(): Promise<ExecutionPolicy[]>;
  upsertExecutionPolicy(input: InsertExecutionPolicy): Promise<ExecutionPolicy>;
  updateExecutionPolicy(policyKey: string, patch: Partial<InsertExecutionPolicy>): Promise<ExecutionPolicy | undefined>;
  getExecutionQueue(limit?: number): Promise<ExecutionQueueItem[]>;
  createExecutionQueueItem(input: InsertExecutionQueueItem): Promise<ExecutionQueueItem>;
  updateExecutionQueueItem(id: number, patch: Partial<InsertExecutionQueueItem>): Promise<ExecutionQueueItem | undefined>;
  getAppliedChanges(limit?: number): Promise<AppliedChange[]>;
  createAppliedChange(input: InsertAppliedChange): Promise<AppliedChange>;
  updateAppliedChange(id: number, patch: UpdateAppliedChange): Promise<AppliedChange | undefined>;
  getAppliedChangeByKey(changeKey: string): Promise<AppliedChange | undefined>;
  getRollbackEvents(limit?: number): Promise<RollbackEvent[]>;
  createRollbackEvent(input: InsertRollbackEvent): Promise<RollbackEvent>;
  getApprovedExperimentsReadyForExecution(): Promise<GrowthExperiment[]>;
  getSafeOverrideCandidates(): Promise<any[]>;
  getSafeCtaCandidates(): Promise<any[]>;
  getLinksPriorityCandidates(): Promise<any[]>;
  getChangeImpactMetrics(changeKey: string): Promise<any>;
  seedDefaultExecutionPolicies(): Promise<void>;

  // Phase 52 — Founder Control, Scale & Maturity
  getUserRoles(): Promise<UserRole[]>;
  upsertUserRole(input: InsertUserRole): Promise<UserRole>;
  updateUserRole(id: number, patch: Partial<InsertUserRole>): Promise<UserRole | undefined>;
  getApprovalRequests(status?: string): Promise<ApprovalRequest[]>;
  createApprovalRequest(input: InsertApprovalRequest): Promise<ApprovalRequest>;
  updateApprovalRequest(id: number, patch: Partial<InsertApprovalRequest>): Promise<ApprovalRequest | undefined>;
  getAiExplanations(entityType?: string, entityId?: string, limit?: number): Promise<AiExplanation[]>;
  createAiExplanation(input: InsertAiExplanation): Promise<AiExplanation>;
  getSystemHealthSnapshots(limit?: number): Promise<SystemHealthSnapshot[]>;
  createSystemHealthSnapshot(input: InsertSystemHealthSnapshot): Promise<SystemHealthSnapshot>;
  getLatestHealthSnapshot(): Promise<SystemHealthSnapshot | undefined>;
  getQuarterlyStrategyReports(limit?: number): Promise<QuarterlyStrategyReport[]>;
  createQuarterlyStrategyReport(input: InsertQuarterlyStrategyReport): Promise<QuarterlyStrategyReport>;
  getFounderOverview(): Promise<any>;
  getWhatChangedToday(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [contactMessage] = await db.insert(contactMessages).values(message).returning();
    return contactMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(contactMessages.createdAt);
  }

  async replyContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [updated] = await db
      .update(contactMessages)
      .set({ repliedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  }

  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [newsletterSubscriber] = await db.insert(newsletterSubscribers).values(subscriber).returning();
    return newsletterSubscriber;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers);
  }

  async getOrCreateChatSession(sessionId: string): Promise<ChatConversation> {
    const [existing] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));

    if (existing) return existing;

    const [created] = await db
      .insert(chatConversations)
      .values({ sessionId, messages: [] })
      .returning();

    return created;
  }

  async appendChatMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const conversation = await this.getOrCreateChatSession(sessionId);
    const currentMessages = (conversation.messages as ChatMessage[]) ?? [];
    const updatedMessages = [...currentMessages, message];

    await db
      .update(chatConversations)
      .set({ messages: updatedMessages, updatedAt: new Date() })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async updateChatLead(sessionId: string, name?: string, email?: string): Promise<void> {
    const updates: Partial<ChatConversation> = { updatedAt: new Date() };
    if (name) updates.leadName = name;
    if (email) updates.leadEmail = email;

    await db
      .update(chatConversations)
      .set(updates)
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getChatConversation(sessionId: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));
    return conversation;
  }

  async getAllChatConversations(temperature?: string): Promise<ChatConversation[]> {
    const query = db.select().from(chatConversations);
    if (temperature && temperature !== "all") {
      return query
        .where(eq(chatConversations.leadTemperature, temperature))
        .orderBy(desc(chatConversations.updatedAt));
    }
    return query.orderBy(desc(chatConversations.updatedAt));
  }

  async updateChatIntelligence(sessionId: string, data: Partial<ChatConversation>): Promise<void> {
    await db
      .update(chatConversations)
      .set(data)
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getChatSession(sessionId: string): Promise<ChatConversation | undefined> {
    const [row] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));
    return row;
  }

  async updateChatSummary(sessionId: string, data: {
    sessionSummary?: string;
    leadQuality?: string;
    recommendedFollowup?: string;
    ctaShown?: string;
    conversionOutcome?: string;
  }): Promise<void> {
    await db
      .update(chatConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async markLeadConverted(sessionId: string): Promise<void> {
    await db
      .update(chatConversations)
      .set({
        conversionOutcome: "converted",
        assignedStage: "converted",
        leadTemperature: "priority",
        updatedAt: new Date(),
      })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async recordPageView(page: string): Promise<void> {
    await db.insert(pageViews).values({ page });
  }

  async getPageViews(): Promise<{ createdAt: Date }[]> {
    return db.select({ createdAt: pageViews.createdAt }).from(pageViews).orderBy(pageViews.createdAt);
  }

  async recordClick(product: string, label: string): Promise<void> {
    await db.insert(clickEvents).values({ product, label });
  }

  async getClickStats(): Promise<{ product: string; label: string; count: number }[]> {
    return db
      .select({
        product: clickEvents.product,
        label: clickEvents.label,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(clickEvents)
      .groupBy(clickEvents.product, clickEvents.label)
      .orderBy(sql`count(*) desc`);
  }

  async getTestimonials(all = false): Promise<Testimonial[]> {
    if (all) {
      return db.select().from(testimonials).orderBy(testimonials.createdAt);
    }
    return db.select().from(testimonials)
      .where(eq(testimonials.approved, true))
      .orderBy(testimonials.createdAt);
  }

  async createTestimonial(t: InsertTestimonial): Promise<Testimonial> {
    const [row] = await db.insert(testimonials).values(t).returning();
    return row;
  }

  async deleteTestimonial(id: number): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }

  async toggleTestimonialApproval(id: number): Promise<Testimonial | undefined> {
    const [existing] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(testimonials)
      .set({ approved: !existing.approved })
      .where(eq(testimonials.id, id))
      .returning();
    return updated;
  }

  async getBlogPosts(publishedOnly = true): Promise<BlogPost[]> {
    if (publishedOnly) {
      return db.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(blogPosts.createdAt);
    }
    return db.select().from(blogPosts).orderBy(blogPosts.createdAt);
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [row] = await db.insert(blogPosts).values(post).returning();
    return row;
  }

  async updateBlogPost(id: number, updates: UpdateBlogPost): Promise<BlogPost | undefined> {
    const [row] = await db.update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return row;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async toggleBlogPostPublished(id: number): Promise<BlogPost | undefined> {
    const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(blogPosts)
      .set({ published: !existing.published, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  // Phase 35 — Knowledge Base
  async getKnowledgeDocs(publishedOnly?: boolean): Promise<KnowledgeDocument[]> {
    const query = db.select().from(knowledgeDocuments);
    if (publishedOnly) {
      return query.where(eq(knowledgeDocuments.isPublished, true)).orderBy(desc(knowledgeDocuments.priority), asc(knowledgeDocuments.createdAt));
    }
    return query.orderBy(desc(knowledgeDocuments.priority), asc(knowledgeDocuments.createdAt));
  }

  async getPublishedKnowledgeByIntent(intent?: string | null): Promise<KnowledgeDocument[]> {
    const INTENT_CATEGORY_MAP: Record<string, string[]> = {
      app_interest: ["apps", "general"],
      book_interest: ["books", "general"],
      music_interest: ["music", "general"],
      art_commission: ["art_studio", "general"],
      sales_service: ["services", "pricing", "general"],
      sales_consultation: ["services", "pricing", "general"],
      support: ["support", "faq", "general"],
      collaboration: ["collaboration", "general"],
      media_press: ["brand_story", "general"],
      newsletter: ["general"],
      general_brand: ["brand_story", "general"],
    };
    const docs = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.isPublished, true))
      .orderBy(desc(knowledgeDocuments.priority), asc(knowledgeDocuments.createdAt));

    if (!intent || !INTENT_CATEGORY_MAP[intent]) return docs.slice(0, 8);

    const preferred = INTENT_CATEGORY_MAP[intent];
    const prioritized = [
      ...docs.filter((d) => preferred.slice(0, -1).includes(d.category)),
      ...docs.filter((d) => d.category === "general"),
      ...docs.filter((d) => !preferred.includes(d.category)),
    ];
    return prioritized.slice(0, 8);
  }

  async createKnowledgeDoc(doc: InsertKnowledgeDoc): Promise<KnowledgeDocument> {
    const [row] = await db.insert(knowledgeDocuments).values(doc).returning();
    return row;
  }

  async updateKnowledgeDoc(id: number, updates: UpdateKnowledgeDoc): Promise<KnowledgeDocument | undefined> {
    const [row] = await db.update(knowledgeDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, id))
      .returning();
    return row;
  }

  async deleteKnowledgeDoc(id: number): Promise<void> {
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
  }

  async toggleKnowledgeDocPublished(id: number): Promise<KnowledgeDocument | undefined> {
    const [existing] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(knowledgeDocuments)
      .set({ isPublished: !existing.isPublished, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, id))
      .returning();
    return updated;
  }

  // Phase 40 — CRM Pipeline
  async updateLeadPipelineStage(
    sessionId: string,
    stage: string,
    note?: string,
    wonValue?: number,
    lostReason?: string,
    followupDueDate?: Date | null
  ): Promise<void> {
    const [existing] = await db
      .select({ stageHistory: chatConversations.stageHistory })
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));
    if (!existing) return;

    const history = (existing.stageHistory as { stage: string; at: string; note?: string }[]) ?? [];
    const newEntry = { stage, at: new Date().toISOString(), ...(note ? { note } : {}) };

    const updateData: Partial<ChatConversation> = {
      pipelineStage: stage,
      stageHistory: [...history, newEntry] as any,
      updatedAt: new Date(),
    };
    if (wonValue !== undefined) updateData.wonValue = wonValue;
    if (lostReason !== undefined) updateData.lostReason = lostReason;
    if (followupDueDate !== undefined) updateData.followupDueDate = followupDueDate ?? undefined;

    await db.update(chatConversations).set(updateData).where(eq(chatConversations.sessionId, sessionId));
  }

  async getLeadsByPipelineStage(stage?: string): Promise<ChatConversation[]> {
    if (stage && stage !== "all") {
      return db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.pipelineStage, stage))
        .orderBy(desc(chatConversations.updatedAt));
    }
    return db.select().from(chatConversations).orderBy(desc(chatConversations.updatedAt));
  }

  // Phase 36 — Consultations
  async getConsultations(activeOnly?: boolean): Promise<Consultation[]> {
    const q = db.select().from(consultations);
    if (activeOnly) {
      return q.where(eq(consultations.isActive, true)).orderBy(asc(consultations.sortOrder), asc(consultations.createdAt));
    }
    return q.orderBy(asc(consultations.sortOrder), asc(consultations.createdAt));
  }

  async getConsultation(id: number): Promise<Consultation | undefined> {
    const [row] = await db.select().from(consultations).where(eq(consultations.id, id));
    return row;
  }

  async createConsultation(data: InsertConsultation): Promise<Consultation> {
    const [row] = await db.insert(consultations).values(data).returning();
    return row;
  }

  async updateConsultation(id: number, data: UpdateConsultation): Promise<Consultation | undefined> {
    const [row] = await db.update(consultations).set(data).where(eq(consultations.id, id)).returning();
    return row;
  }

  async deleteConsultation(id: number): Promise<void> {
    await db.delete(consultations).where(eq(consultations.id, id));
  }

  async toggleConsultationActive(id: number): Promise<Consultation | undefined> {
    const [existing] = await db.select().from(consultations).where(eq(consultations.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(consultations)
      .set({ isActive: !existing.isActive })
      .where(eq(consultations.id, id))
      .returning();
    return updated;
  }

  async seedDefaultConsultations(): Promise<void> {
    const existing = await db.select({ id: consultations.id }).from(consultations).limit(1);
    if (existing.length > 0) return;
    const defaults: InsertConsultation[] = [
      { title: "Brand Strategy Session", description: "Deep-dive into your brand identity, positioning, and growth roadmap. Walk away with a clear action plan to elevate your brand presence across all channels.", duration: 60, price: 9700, currency: "USD", isActive: true, sortOrder: 1 },
      { title: "AI Content Consultation", description: "Learn how to use AI tools to create, schedule, and scale your content strategy. Includes a personalised content calendar template and platform-specific guidance.", duration: 45, price: 7700, currency: "USD", isActive: true, sortOrder: 2 },
      { title: "Creative Direction Call", description: "Get expert creative feedback on your visuals, copywriting, and overall aesthetic. Ideal for product launches, rebrands, or campaigns that need a premium edge.", duration: 60, price: 9700, currency: "USD", isActive: true, sortOrder: 3 },
      { title: "App / Product Consultation", description: "Strategic guidance on your mobile app or digital product — from concept to launch. Covers UX thinking, monetisation, and growth levers based on real-world experience building Bondedlove, Healthwisesupport, and Video Crafter.", duration: 90, price: 14700, currency: "USD", isActive: true, sortOrder: 4 },
      { title: "Collaboration Discovery Call", description: "Explore potential partnerships, brand deals, music licensing, or co-creation opportunities with Elevate360Official. A relaxed, high-value call to see if we're a great fit.", duration: 30, price: 0, currency: "USD", isActive: true, sortOrder: 5 },
    ];
    await db.insert(consultations).values(defaults);
  }

  // Phase 36 — Bookings
  async createBooking(data: InsertBooking): Promise<Booking> {
    const [row] = await db.insert(bookings).values(data).returning();
    return row;
  }

  async getAllBookings(): Promise<(Booking & { consultationTitle?: string })[]> {
    const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    const allConsultations = await db.select({ id: consultations.id, title: consultations.title }).from(consultations);
    const consultMap = Object.fromEntries(allConsultations.map((c) => [c.id, c.title]));
    return rows.map((b) => ({ ...b, consultationTitle: b.consultationId ? consultMap[b.consultationId] : undefined }));
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [row] = await db.update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return row;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Phase 37 — Orders
  async createOrder(data: {
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    stripeProductId?: string;
    stripePriceId?: string;
    productName?: string;
    customerEmail: string;
    customerName?: string;
    amountPaid?: number;
    currency?: string;
    status?: string;
    fulfillmentStatus?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<Order> {
    const [row] = await db.insert(orders).values(data as any).returning();
    return row;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    return row;
  }

  async getOrderByStripeSession(stripeSessionId: string): Promise<Order | undefined> {
    const [row] = await db.select().from(orders).where(eq(orders.stripeSessionId, stripeSessionId));
    return row;
  }

  async updateOrderStatus(stripeSessionId: string, status: string, extra?: Partial<{
    stripePaymentIntentId: string;
    amountPaid: number;
    customerName: string;
  }>): Promise<Order | undefined> {
    const [row] = await db.update(orders)
      .set({ status, updatedAt: new Date(), ...(extra ?? {}) })
      .where(eq(orders.stripeSessionId, stripeSessionId))
      .returning();
    return row;
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderStats(): Promise<{ total: number; paid: number; revenue: number; abandoned: number }> {
    const all = await db.select().from(orders);
    const paid = all.filter((o) => o.status === "paid");
    return {
      total: all.length,
      paid: paid.length,
      revenue: paid.reduce((s, o) => s + (o.amountPaid ?? 0), 0),
      abandoned: all.filter((o) => o.status === "initiated").length,
    };
  }

  // Phase 45 — Reliability & Audit Layer
  async createAuditLog(entry: Omit<InsertAuditLog, "actorLabel"> & { actorLabel?: string }): Promise<AuditLog> {
    const [row] = await db.insert(auditLogs).values({
      actorLabel: entry.actorLabel ?? "admin",
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      meta: entry.meta ?? null,
    }).returning();
    return row;
  }

  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getSystemHealthSummary(): Promise<{ lastLeadAt: Date | null; lastDigestAt: Date | null; totalLeads: number; totalPaidOrders: number; totalAuditActions: number }> {
    const [leads, digests, paidOrders, auditCount] = await Promise.all([
      db.select({ createdAt: chatConversations.createdAt }).from(chatConversations).orderBy(desc(chatConversations.createdAt)).limit(1),
      db.select({ generatedAt: digestReports.generatedAt }).from(digestReports).orderBy(desc(digestReports.generatedAt)).limit(1),
      db.select({ id: orders.id }).from(orders).where(eq(orders.status, "paid")),
      db.select({ id: auditLogs.id }).from(auditLogs),
    ]);
    const [allLeads] = await Promise.all([
      db.select({ id: chatConversations.id }).from(chatConversations),
    ]);
    return {
      lastLeadAt: leads[0]?.createdAt ?? null,
      lastDigestAt: digests[0]?.generatedAt ?? null,
      totalLeads: allLeads.length,
      totalPaidOrders: paidOrders.length,
      totalAuditActions: auditCount.length,
    };
  }

  // Phase 44 — Revenue Attribution Dashboard
  async getRevenueAttributionData(): Promise<{
    monthlySeries: { month: string; stripeRevenue: number; wonRevenue: number; total: number }[];
    byOffer: { name: string; revenue: number; count: number; avgValue: number }[];
    byIntent: { intent: string; revenue: number; count: number }[];
    bySource: { source: string; revenue: number; count: number }[];
    topPaths: { intent: string; offer: string; revenue: number; count: number }[];
    totals: { stripeRevenue: number; wonRevenue: number; combinedRevenue: number; paidOrders: number; wonDeals: number; avgOrderValue: number };
  }> {
    const [paidOrders, allWonSessions] = await Promise.all([
      db.select().from(orders).where(eq(orders.status, "paid")).orderBy(asc(orders.createdAt)),
      db.select({
        intent: chatConversations.intent,
        wonValue: chatConversations.wonValue,
        acceptedOfferSlug: chatConversations.acceptedOfferSlug,
        acceptedOfferSource: chatConversations.acceptedOfferSource,
        updatedAt: chatConversations.updatedAt,
        sessionId: chatConversations.sessionId,
      }).from(chatConversations)
        .where(sql`${chatConversations.pipelineStage} = 'won' AND ${chatConversations.wonValue} IS NOT NULL AND ${chatConversations.wonValue} > 0`),
    ]);

    // M01 fix — exclude won sessions that already have a paid Stripe order to prevent double-counting
    const paidStripeSessionIds = new Set(paidOrders.map((o) => o.sessionId).filter(Boolean));
    const wonSessions = allWonSessions.filter((w) => !paidStripeSessionIds.has(w.sessionId));

    // Build session map for joining orders → intents
    const sessionIntentMap: Record<string, string | null> = {};
    const sessionSourceMap: Record<string, string | null> = {};
    const allSessions = await db.select({
      sessionId: chatConversations.sessionId,
      intent: chatConversations.intent,
      acceptedOfferSource: chatConversations.acceptedOfferSource,
    }).from(chatConversations);
    for (const s of allSessions) {
      sessionIntentMap[s.sessionId] = s.intent;
      sessionSourceMap[s.sessionId] = s.acceptedOfferSource;
    }

    // Monthly series (last 6 months)
    const now = new Date();
    const months: { month: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      months.push({ month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), start: d, end });
    }

    const monthlySeries = months.map(({ month, start, end }) => {
      const stripeRevenue = paidOrders
        .filter((o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end)
        .reduce((s, o) => s + (o.amountPaid ?? 0), 0);
      const wonRevenue = wonSessions
        .filter((s) => new Date(s.updatedAt) >= start && new Date(s.updatedAt) <= end)
        .reduce((s, w) => s + (w.wonValue ?? 0), 0);
      return { month, stripeRevenue, wonRevenue, total: stripeRevenue + wonRevenue };
    });

    // By offer (Stripe orders)
    const offerMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const name = o.productName ?? "Unknown Offer";
      if (!offerMap[name]) offerMap[name] = { revenue: 0, count: 0 };
      offerMap[name].revenue += o.amountPaid ?? 0;
      offerMap[name].count++;
    }
    const byOffer = Object.entries(offerMap)
      .map(([name, d]) => ({ name, revenue: d.revenue, count: d.count, avgValue: d.count > 0 ? Math.round(d.revenue / d.count) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    // By intent (orders joined via sessionId)
    const intentRevMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const intent = (o.sessionId && sessionIntentMap[o.sessionId]) ?? "direct";
      if (!intentRevMap[intent]) intentRevMap[intent] = { revenue: 0, count: 0 };
      intentRevMap[intent].revenue += o.amountPaid ?? 0;
      intentRevMap[intent].count++;
    }
    // Add won pipeline revenue to intent buckets
    for (const w of wonSessions) {
      const intent = w.intent ?? "direct";
      if (!intentRevMap[intent]) intentRevMap[intent] = { revenue: 0, count: 0 };
      intentRevMap[intent].revenue += w.wonValue ?? 0;
      intentRevMap[intent].count++;
    }
    const byIntent = Object.entries(intentRevMap)
      .map(([intent, d]) => ({ intent, revenue: d.revenue, count: d.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // By source
    const sourceMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const source = (o.sessionId && sessionSourceMap[o.sessionId]) ?? "direct";
      if (!sourceMap[source]) sourceMap[source] = { revenue: 0, count: 0 };
      sourceMap[source].revenue += o.amountPaid ?? 0;
      sourceMap[source].count++;
    }
    const bySource = Object.entries(sourceMap)
      .map(([source, d]) => ({ source, revenue: d.revenue, count: d.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top paths: intent → offer
    const pathMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const intent = (o.sessionId && sessionIntentMap[o.sessionId]) ?? "direct";
      const offer = o.productName ?? "Unknown";
      const key = `${intent}||${offer}`;
      if (!pathMap[key]) pathMap[key] = { revenue: 0, count: 0 };
      pathMap[key].revenue += o.amountPaid ?? 0;
      pathMap[key].count++;
    }
    const topPaths = Object.entries(pathMap)
      .map(([key, d]) => { const [intent, offer] = key.split("||"); return { intent, offer, revenue: d.revenue, count: d.count }; })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const stripeRevenue = paidOrders.reduce((s, o) => s + (o.amountPaid ?? 0), 0);
    const wonRevenue = wonSessions.reduce((s, w) => s + (w.wonValue ?? 0), 0);
    const combinedRevenue = stripeRevenue + wonRevenue;

    return {
      monthlySeries,
      byOffer,
      byIntent,
      bySource,
      topPaths,
      totals: {
        stripeRevenue,
        wonRevenue,
        combinedRevenue,
        paidOrders: paidOrders.length,
        wonDeals: wonSessions.length,
        avgOrderValue: paidOrders.length > 0 ? Math.round(stripeRevenue / paidOrders.length) : 0,
      },
    };
  }

  // Phase 43 — Offer Recommendation Optimization
  async getOfferMappingOverrides(): Promise<OfferMappingOverride[]> {
    return db.select().from(offerMappingOverrides).orderBy(asc(offerMappingOverrides.intent));
  }

  async setOfferMappingOverride(intent: string, offer: string): Promise<OfferMappingOverride> {
    const existing = await db.select().from(offerMappingOverrides)
      .where(eq(offerMappingOverrides.intent, intent)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(offerMappingOverrides)
        .set({ overrideOffer: offer, isActive: true, updatedAt: new Date() })
        .where(eq(offerMappingOverrides.intent, intent))
        .returning();
      return updated;
    }
    const [created] = await db.insert(offerMappingOverrides)
      .values({ intent, overrideOffer: offer, isActive: true })
      .returning();
    return created;
  }

  async removeOfferMappingOverride(intent: string): Promise<void> {
    await db.delete(offerMappingOverrides).where(eq(offerMappingOverrides.intent, intent));
  }

  async toggleOfferMappingOverride(intent: string, isActive: boolean): Promise<void> {
    await db.update(offerMappingOverrides)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(offerMappingOverrides.intent, intent));
  }

  async getOfferOptimizerData(): Promise<{
    perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }>;
    perIntent: Record<string, { recommended: number; accepted: number; acceptanceRate: number; topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null }>;
  }> {
    const sessions = await db.select({
      intent: chatConversations.intent,
      recommendedOffer: chatConversations.recommendedOffer,
      acceptedOfferSlug: chatConversations.acceptedOfferSlug,
      recommendedOfferAccepted: chatConversations.recommendedOfferAccepted,
    }).from(chatConversations)
      .where(sql`${chatConversations.recommendedOffer} IS NOT NULL`);

    const perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }> = {};
    const perIntent: Record<string, {
      recommended: number; accepted: number; acceptanceRate: number;
      topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null;
      _offerCounts: Record<string, { rec: number; acc: number }>;
    }> = {};

    for (const s of sessions) {
      const offer = s.recommendedOffer!;
      const intent = s.intent ?? "unknown";
      const accepted = s.recommendedOfferAccepted ?? false;

      // perOffer aggregation
      if (!perOffer[offer]) perOffer[offer] = { recommended: 0, accepted: 0, acceptanceRate: 0, intents: [] };
      perOffer[offer].recommended++;
      if (accepted) perOffer[offer].accepted++;
      if (!perOffer[offer].intents.includes(intent)) perOffer[offer].intents.push(intent);

      // perIntent aggregation
      if (!perIntent[intent]) perIntent[intent] = {
        recommended: 0, accepted: 0, acceptanceRate: 0,
        topOffer: null, currentMapping: null, suggestedOffer: null,
        _offerCounts: {},
      };
      perIntent[intent].recommended++;
      if (accepted) perIntent[intent].accepted++;
      if (!perIntent[intent]._offerCounts[offer]) perIntent[intent]._offerCounts[offer] = { rec: 0, acc: 0 };
      perIntent[intent]._offerCounts[offer].rec++;
      if (accepted) perIntent[intent]._offerCounts[offer].acc++;
    }

    // Compute acceptance rates + suggested offer (highest acceptance rate among offered options)
    for (const offer of Object.values(perOffer)) {
      offer.acceptanceRate = offer.recommended > 0 ? Math.round((offer.accepted / offer.recommended) * 100) : 0;
    }
    for (const [, intentData] of Object.entries(perIntent)) {
      intentData.acceptanceRate = intentData.recommended > 0
        ? Math.round((intentData.accepted / intentData.recommended) * 100) : 0;
      // Find best-performing offer for this intent
      let bestOffer: string | null = null;
      let bestRate = -1;
      for (const [offerName, counts] of Object.entries(intentData._offerCounts)) {
        const rate = counts.rec > 0 ? counts.acc / counts.rec : 0;
        if (rate > bestRate) { bestRate = rate; bestOffer = offerName; }
      }
      intentData.topOffer = bestOffer;
      intentData.suggestedOffer = bestOffer;
    }

    // Strip internal _offerCounts before returning
    const cleanPerIntent: Record<string, { recommended: number; accepted: number; acceptanceRate: number; topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null }> = {};
    for (const [intent, data] of Object.entries(perIntent)) {
      const { _offerCounts: _ignored, ...rest } = data;
      cleanPerIntent[intent] = rest;
    }

    return { perOffer, perIntent: cleanPerIntent };
  }

  // Phase 42 — Follow-Up Automation
  async markFollowupSent(sessionId: string, newDueDate: Date): Promise<void> {
    const conv = await db.select({ followupCount: chatConversations.followupCount })
      .from(chatConversations).where(eq(chatConversations.sessionId, sessionId)).limit(1);
    const currentCount = conv[0]?.followupCount ?? 0;
    await db.update(chatConversations)
      .set({
        lastFollowupSentAt: new Date(),
        followupCount: currentCount + 1,
        followupDueDate: newDueDate,
      })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getReminderQueue(): Promise<{ overdue: ChatConversation[]; silentHot: ChatConversation[] }> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    // M04 fix — removed email-only filter so hot leads without a captured email still appear;
    // the UI already reads capturedEmail/leadEmail from each lead to decide which CTA to show.
    const all = await db.select().from(chatConversations)
      .orderBy(desc(chatConversations.leadScore));

    const overdue = all.filter((s) =>
      s.followupDueDate &&
      new Date(s.followupDueDate) < now &&
      !["won", "lost", "closed"].includes(s.pipelineStage ?? "")
    );

    const silentHot = all.filter((s) => {
      const isHot = (s.leadScore ?? 0) >= 50;
      const lastActivity = s.lastActivityAt ?? s.updatedAt;
      const isSilent = lastActivity && new Date(lastActivity) < threeDaysAgo;
      const notAlreadyOverdue = !(s.followupDueDate && new Date(s.followupDueDate) < now);
      const notWon = !["won", "lost", "closed"].includes(s.pipelineStage ?? "");
      return isHot && isSilent && notAlreadyOverdue && notWon;
    });

    return { overdue, silentHot };
  }

  // Phase 41 — Conversion Analytics
  async markOfferAccepted(sessionId: string, offerSlug: string, source: string): Promise<void> {
    await db.update(chatConversations)
      .set({ recommendedOfferAccepted: true, acceptedOfferSlug: offerSlug, acceptedOfferSource: source })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getConversionFunnel() {
    const all = await db.select().from(chatConversations);
    const allOrders = await db.select({ id: orders.id, status: orders.status }).from(orders);
    const allBookings = await db.select({ id: bookings.id }).from(bookings);
    const totalSessions = all.length;
    const withIntent = all.filter((s) => s.intent).length;
    const emailCaptured = all.filter((s) => s.capturedEmail || s.leadEmail).length;
    const qualified = all.filter((s) => ["qualified", "booked", "won", "converted"].includes(s.pipelineStage)).length;
    const booked = allBookings.length;
    const paidOrders = allOrders.filter((o) => o.status === "paid").length;
    const r = (n: number) => (totalSessions ? Math.round((n / totalSessions) * 100) : 0);
    return {
      totalSessions, withIntent, emailCaptured, qualified, booked, paidOrders,
      stages: [
        { name: "Chat Sessions", count: totalSessions, rate: 100 },
        { name: "Intent Classified", count: withIntent, rate: r(withIntent) },
        { name: "Email Captured", count: emailCaptured, rate: r(emailCaptured) },
        { name: "Qualified", count: qualified, rate: r(qualified) },
        { name: "Booked", count: booked, rate: r(booked) },
        { name: "Won / Paid", count: paidOrders, rate: r(paidOrders) },
      ],
    };
  }

  async getConversionAnalytics() {
    const all = await db.select().from(chatConversations);
    const allBookings = await db.select().from(bookings);
    const allConsultations = await db.select().from(consultations);

    // By intent
    const intentGroups = new Map<string, typeof all>();
    for (const s of all) {
      const key = s.intent ?? "unclassified";
      if (!intentGroups.has(key)) intentGroups.set(key, []);
      intentGroups.get(key)!.push(s);
    }
    const byIntent: Record<string, any> = {};
    for (const [intent, sessions] of Array.from(intentGroups.entries())) {
      const total = sessions.length;
      const qualified = sessions.filter((s) => ["qualified", "booked", "won", "converted"].includes(s.pipelineStage)).length;
      const booked = sessions.filter((s) => ["booked", "won", "converted"].includes(s.pipelineStage)).length;
      const won = sessions.filter((s) => s.pipelineStage === "won").length;
      const offered = sessions.filter((s) => s.recommendedOffer).length;
      const accepted = sessions.filter((s) => s.recommendedOfferAccepted).length;
      byIntent[intent] = {
        total,
        qualified, qualifiedRate: total ? Math.round((qualified / total) * 100) : 0,
        booked, bookedRate: total ? Math.round((booked / total) * 100) : 0,
        won, wonRate: total ? Math.round((won / total) * 100) : 0,
        offered, accepted, offerAcceptanceRate: offered ? Math.round((accepted / offered) * 100) : 0,
      };
    }

    // Offer acceptance breakdown
    const offerAcceptance: Record<string, any> = {};
    for (const s of all.filter((x) => x.recommendedOffer)) {
      const offer = s.recommendedOffer!;
      if (!offerAcceptance[offer]) {
        offerAcceptance[offer] = { timesRecommended: 0, timesAccepted: 0, bySource: { AI: 0, page: 0, direct: 0, dashboard: 0 } };
      }
      offerAcceptance[offer].timesRecommended++;
      if (s.recommendedOfferAccepted) {
        offerAcceptance[offer].timesAccepted++;
        const src = (s.acceptedOfferSource as string) ?? "direct";
        offerAcceptance[offer].bySource[src] = (offerAcceptance[offer].bySource[src] ?? 0) + 1;
      }
    }
    for (const key of Object.keys(offerAcceptance)) {
      const row = offerAcceptance[key];
      row.acceptanceRate = row.timesRecommended ? Math.round((row.timesAccepted / row.timesRecommended) * 100) : 0;
    }

    // Consultation win rates
    const byConsultation: Record<string, any> = {};
    for (const c of allConsultations) {
      const cBookings = allBookings.filter((b) => b.consultationId === c.id);
      const confirmed = cBookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
      byConsultation[String(c.id)] = {
        title: c.title,
        total: cBookings.length,
        confirmed,
        confirmRate: cBookings.length ? Math.round((confirmed / cBookings.length) * 100) : 0,
      };
    }
    return { byIntent, offerAcceptance, byConsultation };
  }

  async getUrgencyDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const all = await db.select().from(chatConversations);
    const allBookings = await db.select({ id: bookings.id, status: bookings.status }).from(bookings);
    const allOrders = await db.select({ id: orders.id, status: orders.status, updatedAt: orders.updatedAt }).from(orders);
    const allContacts = await db.select({ id: contactMessages.id, repliedAt: contactMessages.repliedAt }).from(contactMessages);

    const overdueHotLeads = all.filter((s) =>
      (s.leadScore ?? 0) >= 50 &&
      s.followupDueDate &&
      new Date(s.followupDueDate) < now &&
      !["won", "lost"].includes(s.pipelineStage)
    ).length;

    const newQualifiedLeads = all.filter((s) => {
      if (s.pipelineStage !== "qualified") return false;
      const history = (s.stageHistory as any[]) ?? [];
      const lastQual = [...history].reverse().find((h: any) => h.stage === "qualified");
      return lastQual && new Date(lastQual.timestamp) >= oneDayAgo;
    }).length;

    const pendingBookings = allBookings.filter((b) => b.status === "pending").length;
    const paidOrdersToday = allOrders.filter((o) => o.status === "paid" && new Date(o.updatedAt) >= todayStart).length;
    const unrepliedContacts = allContacts.filter((c) => !c.repliedAt).length;

    const thisWeekLeads = all.filter((s) => s.recommendedOffer && new Date(s.updatedAt) >= weekStart);
    const offerCounts = new Map<string, number>();
    for (const s of thisWeekLeads) {
      const o = s.recommendedOffer!;
      offerCounts.set(o, (offerCounts.get(o) ?? 0) + 1);
    }
    let topRecommendedOffer: string | null = null;
    let topCount = 0;
    for (const [o, c] of Array.from(offerCounts.entries())) {
      if (c > topCount) { topCount = c; topRecommendedOffer = o; }
    }
    return { overdueHotLeads, newQualifiedLeads, pendingBookings, paidOrdersToday, unrepliedContacts, topRecommendedOffer };
  }

  // Phase 39 — Digest Reports
  async saveDigestReport(data: {
    weekStart: Date; weekEnd: Date; narrative: string;
    topIntents: any; hotLeadsCount: number; qualifiedCount: number;
    bookedCount: number; wonValue: number; followupsDue: number;
    unansweredHotLeads: number; topRecommendedOffer: string | null;
    knowledgeBackedChats: number; supportPatterns: string | null;
    contentOpportunities: string | null; conversionByIntent: any;
  }): Promise<DigestReport> {
    const [row] = await db.insert(digestReports).values(data as any).returning();
    return row;
  }

  async getLatestDigest(): Promise<DigestReport | null> {
    const [row] = await db
      .select()
      .from(digestReports)
      .orderBy(desc(digestReports.generatedAt))
      .limit(1);
    return row ?? null;
  }

  async getAllDigests(): Promise<DigestReport[]> {
    return db.select().from(digestReports).orderBy(desc(digestReports.generatedAt));
  }

  // Phase 39 — Dashboard Intelligence KPIs
  async getDashboardIntelligence(): Promise<{
    qualifiedCount: number;
    bookedThisWeek: number;
    wonThisMonth: number;
    overdueFollowups: number;
    topRecommendedOffer: string | null;
    knowledgeBackedChats: number;
    conversionByIntent: Record<string, { total: number; won: number; rate: number }>;
    overdueLeads: { sessionId: string; leadName: string | null; leadEmail: string | null; intent: string | null; followupDueDate: Date | null }[];
  }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const all = await db.select().from(chatConversations);

    const qualifiedCount = all.filter((l) =>
      ["qualified", "booked", "won", "converted"].includes(l.pipelineStage)
    ).length;

    const bookedThisWeek = all.filter(
      (l) => l.pipelineStage === "booked" && l.lastActivityAt && new Date(l.lastActivityAt) >= weekAgo
    ).length;

    const wonThisMonth = all.filter(
      (l) =>
        (l.pipelineStage === "won" || l.pipelineStage === "converted") &&
        l.lastActivityAt &&
        new Date(l.lastActivityAt) >= monthAgo
    ).length;

    const overdueLeads = all.filter(
      (l) =>
        l.followupDueDate &&
        new Date(l.followupDueDate) < now &&
        !["won", "lost", "converted"].includes(l.pipelineStage)
    );
    const overdueFollowups = overdueLeads.length;

    // Top recommended offer among hot/priority leads
    const offerMap = new Map<string, number>();
    for (const l of all) {
      if (l.recommendedOffer && (l.leadScore ?? 0) >= 50) {
        offerMap.set(l.recommendedOffer, (offerMap.get(l.recommendedOffer) ?? 0) + 1);
      }
    }
    const topRecommendedOffer = offerMap.size > 0
      ? Array.from(offerMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    const knowledgeBackedChats = all.filter((l) => l.sessionSummary).length;

    // Conversion by intent
    const intentTotals = new Map<string, number>();
    const intentWons = new Map<string, number>();
    for (const l of all) {
      if (!l.intent) continue;
      intentTotals.set(l.intent, (intentTotals.get(l.intent) ?? 0) + 1);
      if (l.pipelineStage === "won" || l.pipelineStage === "converted") {
        intentWons.set(l.intent, (intentWons.get(l.intent) ?? 0) + 1);
      }
    }
    const conversionByIntent: Record<string, { total: number; won: number; rate: number }> = {};
    for (const [intent, total] of Array.from(intentTotals.entries())) {
      const won = intentWons.get(intent) ?? 0;
      conversionByIntent[intent] = { total, won, rate: total > 0 ? Math.round((won / total) * 100) : 0 };
    }

    return {
      qualifiedCount,
      bookedThisWeek,
      wonThisMonth,
      overdueFollowups,
      topRecommendedOffer,
      knowledgeBackedChats,
      conversionByIntent,
      overdueLeads: overdueLeads.map((l) => ({
        sessionId: l.sessionId,
        leadName: l.leadName ?? l.capturedName,
        leadEmail: l.leadEmail ?? l.capturedEmail,
        intent: l.intent,
        followupDueDate: l.followupDueDate,
      })),
    };
  }

  async getAutomationSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(automationSettings).where(eq(automationSettings.key, key)).limit(1);
    return row?.value ?? null;
  }

  async setAutomationSetting(key: string, value: string): Promise<void> {
    await db.insert(automationSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: automationSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getDashboardSummary() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [allLeads, allOrders, allSubscribers, allContacts, allBookings] = await Promise.all([
      db.select().from(chatConversations),
      db.select().from(orders),
      db.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers),
      db.select({ id: contactMessages.id, repliedAt: contactMessages.repliedAt }).from(contactMessages),
      db.select({ id: bookings.id, status: bookings.status }).from(bookings),
    ]);

    const paidOrders = allOrders.filter((o) => o.status === "paid");
    const stripeRevenue = paidOrders.reduce((s, o) => s + (o.amountPaid ?? 0), 0);

    const intentCounts = new Map<string, number>();
    const offerCounts = new Map<string, number>();
    for (const l of allLeads) {
      if (l.intent) intentCounts.set(l.intent, (intentCounts.get(l.intent) ?? 0) + 1);
      if (l.recommendedOffer && (l.leadScore ?? 0) >= 50)
        offerCounts.set(l.recommendedOffer, (offerCounts.get(l.recommendedOffer) ?? 0) + 1);
    }
    const topIntent = intentCounts.size > 0
      ? Array.from(intentCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;
    const topRecommendedOffer = offerCounts.size > 0
      ? Array.from(offerCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      leads: {
        total: allLeads.length,
        emailCaptured: allLeads.filter((l) => l.capturedEmail || l.leadEmail).length,
        hot: allLeads.filter((l) => l.leadTemperature === "hot" || l.leadTemperature === "priority").length,
        qualified: allLeads.filter((l) => ["qualified", "booked", "won", "converted"].includes(l.pipelineStage)).length,
        bookedThisWeek: allLeads.filter((l) => l.pipelineStage === "booked" && l.lastActivityAt && new Date(l.lastActivityAt) >= weekAgo).length,
        wonThisMonth: allLeads.filter((l) => ["won", "converted"].includes(l.pipelineStage) && l.lastActivityAt && new Date(l.lastActivityAt) >= monthAgo).length,
      },
      revenue: {
        totalPaid: stripeRevenue,
        paidOrders: paidOrders.length,
        avgOrderValue: paidOrders.length > 0 ? Math.round(stripeRevenue / paidOrders.length) : 0,
        abandoned: allOrders.filter((o) => o.status === "initiated").length,
      },
      engagement: {
        newsletterSubscribers: allSubscribers.length,
        contactForms: allContacts.length,
        unrepliedContacts: allContacts.filter((c) => !c.repliedAt).length,
        pendingBookings: allBookings.filter((b) => b.status === "pending").length,
      },
      topIntent,
      topRecommendedOffer,
      generatedAt: now.toISOString(),
    };
  }

  // ── Phase 49 — Automation Jobs ──────────────────────────────────────────────

  async getAutomationJobs(): Promise<AutomationJob[]> {
    return db.select().from(automationJobs).orderBy(asc(automationJobs.jobGroup), asc(automationJobs.jobKey));
  }

  async upsertAutomationJob(jobKey: string, patch: Partial<InsertAutomationJob>): Promise<AutomationJob> {
    const existing = await db.select().from(automationJobs).where(eq(automationJobs.jobKey, jobKey)).limit(1);
    if (existing[0]) {
      const [updated] = await db.update(automationJobs)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(automationJobs.jobKey, jobKey))
        .returning();
      return updated;
    }
    const [created] = await db.insert(automationJobs)
      .values({
        jobKey,
        jobGroup: patch.jobGroup ?? "autonomous",
        status: patch.status ?? "idle",
        isEnabled: patch.isEnabled ?? true,
        cadenceMinutes: patch.cadenceMinutes ?? null,
        nextRunAt: patch.nextRunAt ?? null,
      })
      .returning();
    return created;
  }

  async createAutomationJobLog(input: InsertAutomationJobLog): Promise<void> {
    await db.insert(automationJobLogs).values(input);
  }

  async getAutomationJobLogs(jobKey: string, limit = 50): Promise<AutomationJobLog[]> {
    return db.select().from(automationJobLogs)
      .where(eq(automationJobLogs.jobKey, jobKey))
      .orderBy(desc(automationJobLogs.startedAt))
      .limit(limit);
  }

  // ── Phase 49 — Revenue Recovery ─────────────────────────────────────────────

  async getRevenueRecoveryActions(limit = 100): Promise<RevenueRecoveryAction[]> {
    return db.select().from(revenueRecoveryActions)
      .orderBy(desc(revenueRecoveryActions.priorityScore), desc(revenueRecoveryActions.createdAt))
      .limit(limit);
  }

  async createRevenueRecoveryAction(input: InsertRevenueRecoveryAction): Promise<RevenueRecoveryAction> {
    const [row] = await db.insert(revenueRecoveryActions).values(input).returning();
    return row;
  }

  async updateRevenueRecoveryAction(id: number, patch: UpdateRevenueRecoveryAction): Promise<RevenueRecoveryAction | undefined> {
    const [row] = await db.update(revenueRecoveryActions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(revenueRecoveryActions.id, id))
      .returning();
    return row;
  }

  async listAcceptedButUnpaidSessions(): Promise<any[]> {
    return db.select({
        sessionId: chatConversations.sessionId,
        leadEmail: chatConversations.leadEmail,
        leadName: chatConversations.leadName,
        leadScore: chatConversations.leadScore,
        productName: orders.productName,
        orderId: orders.id,
        orderStatus: orders.status,
        recoveryStatus: orders.recoveryStatus,
        createdAt: orders.createdAt,
      })
      .from(chatConversations)
      .leftJoin(orders, eq(orders.sessionId, chatConversations.sessionId))
      .where(
        and(
          eq(chatConversations.requiresFollowup, true),
          gte(chatConversations.leadScore, 60),
          or(isNull(orders.id), ne(orders.status, "paid"))
        )
      )
      .orderBy(desc(chatConversations.leadScore), desc(chatConversations.updatedAt));
  }

  async listAbandonedCheckoutOrders(hoursSinceCreated = 1): Promise<any[]> {
    const cutoff = new Date(Date.now() - hoursSinceCreated * 60 * 60 * 1000);
    return db.select().from(orders).where(
      and(
        lte(orders.createdAt, cutoff),
        ne(orders.status, "paid"),
        or(eq(orders.recoveryStatus, "none"), isNull(orders.recoveryStatus))
      )
    ).orderBy(desc(orders.createdAt));
  }

  async listStaleFulfillmentOrders(hoursStale = 24): Promise<any[]> {
    const cutoff = new Date(Date.now() - hoursStale * 60 * 60 * 1000);
    return db.select().from(orders).where(
      and(
        eq(orders.status, "paid"),
        or(eq(orders.fulfillmentStatus, "queued"), eq(orders.fulfillmentStatus, "processing")),
        lte(orders.updatedAt, cutoff)
      )
    ).orderBy(desc(orders.updatedAt));
  }

  // ── Phase 49 — Content Opportunities ────────────────────────────────────────

  async getContentOpportunities(limit = 100): Promise<ContentOpportunity[]> {
    return db.select().from(contentOpportunities)
      .orderBy(desc(contentOpportunities.opportunityScore), desc(contentOpportunities.createdAt))
      .limit(limit);
  }

  async createContentOpportunity(input: InsertContentOpportunity): Promise<ContentOpportunity> {
    const [row] = await db.insert(contentOpportunities).values(input).returning();
    return row;
  }

  async updateContentOpportunity(id: number, patch: UpdateContentOpportunity): Promise<ContentOpportunity | undefined> {
    const [row] = await db.update(contentOpportunities)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(contentOpportunities.id, id))
      .returning();
    return row;
  }

  // ── Phase 49 — Executive Digests ─────────────────────────────────────────────

  async getLatestDigestByType(reportType: string): Promise<any | undefined> {
    const [row] = await db.select().from(digestReports)
      .where(eq(digestReports.reportType, reportType))
      .orderBy(desc(digestReports.generatedAt))
      .limit(1);
    return row;
  }

  async createDigestReportTyped(input: any): Promise<any> {
    const [row] = await db.insert(digestReports).values(input).returning();
    return row;
  }

  // ── Phase 49 — Autonomous Alerts ─────────────────────────────────────────────

  async getAutonomousAlerts(limit = 100): Promise<AutonomousAlert[]> {
    return db.select().from(autonomousAlerts)
      .orderBy(
        sql`CASE ${autonomousAlerts.severity}
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4 END`,
        desc(autonomousAlerts.createdAt)
      )
      .limit(limit);
  }

  async createAutonomousAlert(input: InsertAutonomousAlert): Promise<AutonomousAlert> {
    const [row] = await db.insert(autonomousAlerts).values(input).returning();
    return row;
  }

  async updateAutonomousAlert(id: number, patch: UpdateAutonomousAlert): Promise<AutonomousAlert | undefined> {
    const [row] = await db.update(autonomousAlerts)
      .set(patch)
      .where(eq(autonomousAlerts.id, id))
      .returning();
    return row;
  }

  // ─── Phase 50: Growth Optimization ──────────────────────────────────────────

  async getGrowthExperiments(limit = 100): Promise<GrowthExperiment[]> {
    return db.select().from(growthExperiments)
      .orderBy(desc(growthExperiments.expectedImpactScore), desc(growthExperiments.createdAt))
      .limit(limit);
  }

  async createGrowthExperiment(input: InsertGrowthExperiment): Promise<GrowthExperiment> {
    const [row] = await db.insert(growthExperiments).values(input).returning();
    return row;
  }

  async updateGrowthExperiment(id: number, patch: UpdateGrowthExperiment): Promise<GrowthExperiment | undefined> {
    const [row] = await db.update(growthExperiments)
      .set(patch)
      .where(eq(growthExperiments.id, id))
      .returning();
    return row;
  }

  async getLatestSourcePerformance(limit = 100): Promise<SourcePerformanceSnapshot[]> {
    return db.select().from(sourcePerformanceSnapshots)
      .orderBy(desc(sourcePerformanceSnapshots.snapshotDate), desc(sourcePerformanceSnapshots.qualityScore))
      .limit(limit);
  }

  async createSourcePerformanceSnapshot(input: InsertSourcePerformanceSnapshot): Promise<SourcePerformanceSnapshot> {
    const [row] = await db.insert(sourcePerformanceSnapshots).values(input).returning();
    return row;
  }

  async getLatestFunnelLeaks(limit = 50): Promise<FunnelLeakReport[]> {
    return db.select().from(funnelLeakReports)
      .orderBy(desc(funnelLeakReports.createdAt), desc(funnelLeakReports.severityScore))
      .limit(limit);
  }

  async createFunnelLeakReport(input: InsertFunnelLeakReport): Promise<FunnelLeakReport> {
    const [row] = await db.insert(funnelLeakReports).values(input).returning();
    return row;
  }

  async getLatestOfferPerformance(limit = 100): Promise<OfferPerformanceSnapshot[]> {
    return db.select().from(offerPerformanceSnapshots)
      .orderBy(desc(offerPerformanceSnapshots.snapshotDate), desc(offerPerformanceSnapshots.performanceScore))
      .limit(limit);
  }

  async createOfferPerformanceSnapshot(input: InsertOfferPerformanceSnapshot): Promise<OfferPerformanceSnapshot> {
    const [row] = await db.insert(offerPerformanceSnapshots).values(input).returning();
    return row;
  }

  async getSourcePerformanceCandidates(periodDays = 14): Promise<any[]> {
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const result: any = await db.execute(sql`
      with pv as (
        select coalesce(page, 'unknown') as source_name,
          count(*)::int as visits
        from page_views where created_at >= ${start} group by 1
      ),
      chats as (
        select
          coalesce(intent, 'unknown') as source_name,
          count(*)::int as chat_leads,
          count(*) filter (where lead_score >= 60)::int as qualified_leads
        from chat_conversations where created_at >= ${start} group by 1
      ),
      b as (
        select 'bookings' as source_name, count(*)::int as bookings
        from bookings where created_at >= ${start}
      ),
      o as (
        select 'orders' as source_name,
          count(*) filter (where status = 'paid')::int as paid_orders,
          coalesce(sum(case when status = 'paid' then amount_paid else 0 end), 0)::int as revenue,
          coalesce(avg(case when status = 'paid' then amount_paid end), 0)::int as avg_order_value
        from orders where created_at >= ${start}
      )
      select
        pv.source_name,
        pv.visits,
        coalesce(chats.chat_leads, 0) as chat_leads,
        coalesce(chats.qualified_leads, 0) as qualified_leads,
        (select bookings from b limit 1) as bookings,
        (select paid_orders from o limit 1) as paid_orders,
        (select revenue from o limit 1) as revenue,
        (select avg_order_value from o limit 1) as avg_order_value
      from pv
      left join chats on chats.source_name = pv.source_name
      order by pv.visits desc
      limit 20
    `);
    return result.rows ?? result;
  }

  async getOfferPerformanceCandidates(periodDays = 30): Promise<any[]> {
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const result: any = await db.execute(sql`
      select
        coalesce(recommended_offer, accepted_offer_slug, 'unknown') as offer_slug,
        intent,
        null::text as source_name,
        count(*) filter (where recommended_offer is not null)::int as recommended_count,
        count(*) filter (where recommended_offer_accepted = true)::int as accepted_count,
        0::int as paid_count,
        0::int as avg_order_value
      from chat_conversations
      where created_at >= ${start}
        and coalesce(recommended_offer, accepted_offer_slug) is not null
      group by 1,2,3
      order by recommended_count desc
      limit 30
    `);
    return result.rows ?? result;
  }

  async getFunnelLeakCandidates(periodDays = 14): Promise<any> {
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const [visitsRow] = await db.select({ c: count() }).from(pageViews).where(gte(pageViews.createdAt, start));
    const [chatsRow] = await db.select({ c: count() }).from(chatConversations).where(gte(chatConversations.createdAt, start));
    const [qualifiedRow] = await db.select({ c: count() }).from(chatConversations)
      .where(and(gte(chatConversations.createdAt, start), gte(chatConversations.leadScore, 60)));
    const [bookedRow] = await db.select({ c: count() }).from(bookings).where(gte(bookings.createdAt, start));
    const [wonRow] = await db.select({ c: count() }).from(orders)
      .where(and(gte(orders.createdAt, start), eq(orders.status, "paid")));
    return {
      visits: Number(visitsRow?.c ?? 0),
      chats: Number(chatsRow?.c ?? 0),
      qualified: Number(qualifiedRow?.c ?? 0),
      booked: Number(bookedRow?.c ?? 0),
      won: Number(wonRow?.c ?? 0),
      periodStart: start,
      periodEnd: new Date(),
    };
  }
  // ── Phase 51: Autonomous Execution ──────────────────────────────────────────

  async getExecutionPolicies(): Promise<ExecutionPolicy[]> {
    return db.select().from(executionPolicies).orderBy(executionPolicies.area);
  }

  async upsertExecutionPolicy(input: InsertExecutionPolicy): Promise<ExecutionPolicy> {
    const [row] = await db
      .insert(executionPolicies)
      .values(input)
      .onConflictDoUpdate({
        target: executionPolicies.policyKey,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async updateExecutionPolicy(policyKey: string, patch: Partial<InsertExecutionPolicy>): Promise<ExecutionPolicy | undefined> {
    const [row] = await db
      .update(executionPolicies)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(executionPolicies.policyKey, policyKey))
      .returning();
    return row;
  }

  async getExecutionQueue(limit = 50): Promise<ExecutionQueueItem[]> {
    return db.select().from(executionQueue)
      .orderBy(desc(executionQueue.priorityScore), desc(executionQueue.createdAt))
      .limit(limit);
  }

  async createExecutionQueueItem(input: InsertExecutionQueueItem): Promise<ExecutionQueueItem> {
    const [row] = await db.insert(executionQueue).values(input).returning();
    return row;
  }

  async updateExecutionQueueItem(id: number, patch: Partial<InsertExecutionQueueItem>): Promise<ExecutionQueueItem | undefined> {
    const [row] = await db.update(executionQueue).set(patch).where(eq(executionQueue.id, id)).returning();
    return row;
  }

  async getAppliedChanges(limit = 100): Promise<AppliedChange[]> {
    return db.select().from(appliedChanges)
      .orderBy(desc(appliedChanges.createdAt))
      .limit(limit);
  }

  async createAppliedChange(input: InsertAppliedChange): Promise<AppliedChange> {
    const [row] = await db.insert(appliedChanges).values(input).returning();
    return row;
  }

  async updateAppliedChange(id: number, patch: UpdateAppliedChange): Promise<AppliedChange | undefined> {
    const [row] = await db.update(appliedChanges).set(patch).where(eq(appliedChanges.id, id)).returning();
    return row;
  }

  async getAppliedChangeByKey(changeKey: string): Promise<AppliedChange | undefined> {
    const [row] = await db.select().from(appliedChanges).where(eq(appliedChanges.changeKey, changeKey));
    return row;
  }

  async getRollbackEvents(limit = 50): Promise<RollbackEvent[]> {
    return db.select().from(rollbackEvents).orderBy(desc(rollbackEvents.createdAt)).limit(limit);
  }

  async createRollbackEvent(input: InsertRollbackEvent): Promise<RollbackEvent> {
    const [row] = await db.insert(rollbackEvents).values(input).returning();
    return row;
  }

  async getApprovedExperimentsReadyForExecution(): Promise<GrowthExperiment[]> {
    return db.select().from(growthExperiments)
      .where(eq(growthExperiments.status, "approved"))
      .orderBy(desc(growthExperiments.expectedImpactScore))
      .limit(10);
  }

  async getSafeOverrideCandidates(): Promise<any[]> {
    const rows = await db.select().from(offerPerformanceSnapshots)
      .orderBy(desc(offerPerformanceSnapshots.performanceScore))
      .limit(10);
    return rows.filter((r) => r.performanceScore >= 70);
  }

  async getSafeCtaCandidates(): Promise<any[]> {
    const leaks = await db.select().from(funnelLeakReports)
      .orderBy(desc(funnelLeakReports.severityScore))
      .limit(5);
    return leaks.map((l) => ({
      stage: l.leakStage,
      severityScore: l.severityScore,
      dropoffRate: l.dropoffRate,
      recommendedFix: l.recommendedFix,
    }));
  }

  async getLinksPriorityCandidates(): Promise<any[]> {
    const clicks = await db.select().from(clickEvents)
      .orderBy(desc(clickEvents.createdAt))
      .limit(200);
    const byProduct: Record<string, number> = {};
    for (const c of clicks) {
      byProduct[c.product] = (byProduct[c.product] ?? 0) + 1;
    }
    return Object.entries(byProduct)
      .map(([product, count]) => ({ product, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getChangeImpactMetrics(changeKey: string): Promise<any> {
    const change = await this.getAppliedChangeByKey(changeKey);
    if (!change) return null;
    const since = change.appliedAt ?? change.createdAt;
    const [leadsAfter] = await db.select({ c: count() }).from(chatConversations)
      .where(gte(chatConversations.createdAt, since));
    const [ordersAfter] = await db.select({ c: count() }).from(orders)
      .where(and(gte(orders.createdAt, since), eq(orders.status, "paid")));
    const rollbacks = await db.select().from(rollbackEvents)
      .where(eq(rollbackEvents.appliedChangeId, change.id));
    return {
      changeKey,
      appliedAt: since,
      leadsAfter: Number(leadsAfter?.c ?? 0),
      ordersAfter: Number(ordersAfter?.c ?? 0),
      hasRollback: rollbacks.length > 0,
      change,
    };
  }

  // ── Phase 52: Founder Control, Scale & Maturity ──────────────────────────────

  async getUserRoles(): Promise<UserRole[]> {
    return db.select().from(userRoles).orderBy(userRoles.role);
  }

  async upsertUserRole(input: InsertUserRole): Promise<UserRole> {
    const [row] = await db
      .insert(userRoles)
      .values(input)
      .onConflictDoUpdate({ target: userRoles.email, set: { ...input } })
      .returning();
    return row;
  }

  async updateUserRole(id: number, patch: Partial<InsertUserRole>): Promise<UserRole | undefined> {
    const [row] = await db.update(userRoles).set(patch).where(eq(userRoles.id, id)).returning();
    return row;
  }

  async getApprovalRequests(status?: string): Promise<ApprovalRequest[]> {
    const q = db.select().from(approvalRequests).orderBy(desc(approvalRequests.createdAt));
    if (status) {
      return q.where(eq(approvalRequests.status, status)).limit(100);
    }
    return q.limit(100);
  }

  async createApprovalRequest(input: InsertApprovalRequest): Promise<ApprovalRequest> {
    const [row] = await db.insert(approvalRequests).values(input).returning();
    return row;
  }

  async updateApprovalRequest(id: number, patch: Partial<InsertApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const [row] = await db.update(approvalRequests).set(patch).where(eq(approvalRequests.id, id)).returning();
    return row;
  }

  async getAiExplanations(entityType?: string, entityId?: string, limit = 50): Promise<AiExplanation[]> {
    const q = db.select().from(aiExplanations).orderBy(desc(aiExplanations.createdAt));
    if (entityType && entityId) {
      return q.where(and(eq(aiExplanations.entityType, entityType), eq(aiExplanations.entityId, entityId))).limit(limit);
    }
    if (entityType) {
      return q.where(eq(aiExplanations.entityType, entityType)).limit(limit);
    }
    return q.limit(limit);
  }

  async createAiExplanation(input: InsertAiExplanation): Promise<AiExplanation> {
    const [row] = await db.insert(aiExplanations).values(input).returning();
    return row;
  }

  async getSystemHealthSnapshots(limit = 30): Promise<SystemHealthSnapshot[]> {
    return db.select().from(systemHealthSnapshots).orderBy(desc(systemHealthSnapshots.snapshotTime)).limit(limit);
  }

  async createSystemHealthSnapshot(input: InsertSystemHealthSnapshot): Promise<SystemHealthSnapshot> {
    const [row] = await db.insert(systemHealthSnapshots).values(input).returning();
    return row;
  }

  async getLatestHealthSnapshot(): Promise<SystemHealthSnapshot | undefined> {
    const [row] = await db.select().from(systemHealthSnapshots).orderBy(desc(systemHealthSnapshots.snapshotTime)).limit(1);
    return row;
  }

  async getQuarterlyStrategyReports(limit = 10): Promise<QuarterlyStrategyReport[]> {
    return db.select().from(quarterlyStrategyReports).orderBy(desc(quarterlyStrategyReports.createdAt)).limit(limit);
  }

  async createQuarterlyStrategyReport(input: InsertQuarterlyStrategyReport): Promise<QuarterlyStrategyReport> {
    const [row] = await db.insert(quarterlyStrategyReports).values(input).returning();
    return row;
  }

  async getFounderOverview(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [changedToday] = await db.select({ c: count() }).from(appliedChanges).where(gte(appliedChanges.createdAt, today));
    const [rolledBackToday] = await db.select({ c: count() }).from(rollbackEvents).where(gte(rollbackEvents.createdAt, today));
    const [pendingApprovals] = await db.select({ c: count() }).from(executionQueue).where(eq(executionQueue.status, "pending"));
    const [pendingRequests] = await db.select({ c: count() }).from(approvalRequests).where(eq(approvalRequests.status, "pending"));
    const latestHealth = await this.getLatestHealthSnapshot();
    const topExperiment = await db.select().from(growthExperiments)
      .where(eq(growthExperiments.status, "won"))
      .orderBy(desc(growthExperiments.expectedImpactScore))
      .limit(1);
    const topSource = await db.select().from(sourcePerformanceSnapshots)
      .orderBy(desc(sourcePerformanceSnapshots.qualityScore))
      .limit(1);
    const topOffer = await db.select().from(offerPerformanceSnapshots)
      .orderBy(desc(offerPerformanceSnapshots.performanceScore))
      .limit(1);
    return {
      changedToday: Number(changedToday?.c ?? 0),
      rolledBackToday: Number(rolledBackToday?.c ?? 0),
      pendingApprovals: Number(pendingApprovals?.c ?? 0) + Number(pendingRequests?.c ?? 0),
      maturityScore: latestHealth?.overallMaturityScore ?? 0,
      topGrowthWin: topExperiment[0] ?? null,
      topSource: topSource[0] ?? null,
      topOffer: topOffer[0] ?? null,
    };
  }

  async getWhatChangedToday(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const changes = await db.select().from(appliedChanges).where(gte(appliedChanges.createdAt, today)).orderBy(desc(appliedChanges.createdAt));
    const rollbacks = await db.select().from(rollbackEvents).where(gte(rollbackEvents.createdAt, today)).orderBy(desc(rollbackEvents.createdAt));
    const experiments = await db.select().from(growthExperiments).where(gte(growthExperiments.createdAt, today)).orderBy(desc(growthExperiments.createdAt));
    const queued = await db.select().from(executionQueue).where(gte(executionQueue.createdAt, today)).orderBy(desc(executionQueue.createdAt));
    return { changes, rollbacks, experiments, queued };
  }

  async seedDefaultExecutionPolicies(): Promise<void> {
    const defaults: InsertExecutionPolicy[] = [
      { policyKey: "offer_auto_apply", area: "offer", mode: "suggest_only", minConfidence: 75, maxRiskScore: 20, isEnabled: true },
      { policyKey: "cta_auto_apply", area: "cta", mode: "approval_required", minConfidence: 70, maxRiskScore: 25, isEnabled: true },
      { policyKey: "links_auto_apply", area: "links", mode: "auto_apply_safe", minConfidence: 80, maxRiskScore: 15, isEnabled: true },
      { policyKey: "experiment_auto_apply", area: "experiment", mode: "approval_required", minConfidence: 80, maxRiskScore: 20, isEnabled: true },
      { policyKey: "override_auto_apply", area: "override", mode: "suggest_only", minConfidence: 85, maxRiskScore: 10, isEnabled: true },
    ];
    for (const policy of defaults) {
      await this.upsertExecutionPolicy(policy);
    }
  }
}

export const storage = new DatabaseStorage();
