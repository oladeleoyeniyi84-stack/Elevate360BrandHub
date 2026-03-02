import {
  type User, type InsertUser,
  type ContactMessage, type InsertContactMessage,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  users, contactMessages, newsletterSubscribers
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
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
    return db.select().from(contactMessages);
  }

  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [newsletterSubscriber] = await db.insert(newsletterSubscribers).values(subscriber).returning();
    return newsletterSubscriber;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers);
  }
}

export const storage = new DatabaseStorage();