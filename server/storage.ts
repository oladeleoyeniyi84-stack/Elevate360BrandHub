import {
  type User, type InsertUser,
  type ContactMessage, type InsertContactMessage,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type ChatConversation, type ChatMessage,
  users, contactMessages, newsletterSubscribers, chatConversations, clickEvents, pageViews,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

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
  getAllChatConversations(): Promise<ChatConversation[]>;
  recordPageView(page: string): Promise<void>;
  getPageViews(): Promise<{ createdAt: Date }[]>;
  recordClick(product: string, label: string): Promise<void>;
  getClickStats(): Promise<{ product: string; label: string; count: number }[]>;
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

  async getAllChatConversations(): Promise<ChatConversation[]> {
    return db
      .select()
      .from(chatConversations)
      .orderBy(chatConversations.updatedAt);
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
}

export const storage = new DatabaseStorage();
