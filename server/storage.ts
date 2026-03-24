import {
  type User, type InsertUser,
  type ContactMessage, type InsertContactMessage,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type ChatConversation, type ChatMessage,
  type Testimonial, type InsertTestimonial,
  type BlogPost, type InsertBlogPost, type UpdateBlogPost,
  type KnowledgeDocument, type InsertKnowledgeDoc, type UpdateKnowledgeDoc,
  users, contactMessages, newsletterSubscribers, chatConversations, clickEvents, pageViews, testimonials, blogPosts, knowledgeDocuments,
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
}

export const storage = new DatabaseStorage();
