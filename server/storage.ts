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
  users, contactMessages, newsletterSubscribers, chatConversations, clickEvents, pageViews, testimonials, blogPosts, knowledgeDocuments, consultations, bookings, orders, digestReports,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, asc } from "drizzle-orm";

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
  getOrderByStripeSession(stripeSessionId: string): Promise<Order | undefined>;
  updateOrderStatus(stripeSessionId: string, status: string, extra?: any): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrderStats(): Promise<{ total: number; paid: number; revenue: number; abandoned: number }>;
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
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<Order> {
    const [row] = await db.insert(orders).values(data as any).returning();
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
    const all = await db.select().from(chatConversations)
      .where(sql`(${chatConversations.leadEmail} IS NOT NULL OR ${chatConversations.capturedEmail} IS NOT NULL)`)
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
    for (const [intent, sessions] of intentGroups.entries()) {
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
    for (const [o, c] of offerCounts.entries()) {
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
      ? [...offerMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
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
    for (const [intent, total] of intentTotals) {
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
}

export const storage = new DatabaseStorage();
