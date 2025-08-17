import { users, anonymousMessages, securityLogs, polls, pollVotes, rateLimits, applications, auctions, type User, type InsertUser, type AnonymousMessage, type InsertAnonymousMessage, type SecurityLog, type InsertSecurityLog, type Poll, type InsertPoll, type PollVote, type InsertPollVote, type RateLimit, type InsertRateLimit, type Application, type InsertApplication, type Auction, type InsertAuction } from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(discordId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(discordId: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Anonymous message operations
  createAnonymousMessage(message: InsertAnonymousMessage): Promise<AnonymousMessage>;
  getAnonymousMessage(messageId: string): Promise<AnonymousMessage | undefined>;
  getAnonymousMessagesByUser(authorId: string): Promise<AnonymousMessage[]>;
  
  // Security log operations
  createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog>;
  getSecurityLogs(userId?: string): Promise<SecurityLog[]>;
  
  // Poll operations
  createPoll(poll: InsertPoll): Promise<Poll>;
  getPoll(pollId: string): Promise<Poll | undefined>;
  getActivePolls(): Promise<Poll[]>;
  closePoll(pollId: string): Promise<void>;
  
  // Poll vote operations
  createPollVote(vote: InsertPollVote): Promise<PollVote>;
  getPollVotes(pollId: string): Promise<PollVote[]>;
  getUserPollVote(pollId: string, userId: string): Promise<PollVote | undefined>;
  
  // Rate limit operations
  getRateLimit(userId: string): Promise<RateLimit | undefined>;
  updateRateLimit(userId: string, updates: Partial<RateLimit>): Promise<RateLimit>;
  createRateLimit(rateLimit: InsertRateLimit): Promise<RateLimit>;
  
  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(applicationId: string): Promise<Application | undefined>;
  getPendingApplications(): Promise<Application[]>;
  updateApplication(applicationId: string, updates: Partial<Application>): Promise<Application | undefined>;
  
  // Auction operations
  createAuction(auction: InsertAuction): Promise<Auction>;
  getAuction(auctionId: string): Promise<Auction | undefined>;
  getActiveAuctions(): Promise<Auction[]>;
  updateAuction(auctionId: string, updates: Partial<Auction>): Promise<Auction | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(discordId: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.discordId, discordId))
      .returning();
    return user || undefined;
  }

  // Anonymous message operations
  async createAnonymousMessage(message: InsertAnonymousMessage): Promise<AnonymousMessage> {
    const [msg] = await db
      .insert(anonymousMessages)
      .values(message)
      .returning();
    return msg;
  }

  async getAnonymousMessage(messageId: string): Promise<AnonymousMessage | undefined> {
    const [message] = await db
      .select()
      .from(anonymousMessages)
      .where(eq(anonymousMessages.messageId, messageId));
    return message || undefined;
  }

  async getAnonymousMessagesByUser(authorId: string): Promise<AnonymousMessage[]> {
    return await db
      .select()
      .from(anonymousMessages)
      .where(eq(anonymousMessages.authorId, authorId))
      .orderBy(desc(anonymousMessages.createdAt));
  }

  // Security log operations
  async createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog> {
    const [secLog] = await db
      .insert(securityLogs)
      .values(log)
      .returning();
    return secLog;
  }

  async getSecurityLogs(userId?: string): Promise<SecurityLog[]> {
    const query = db.select().from(securityLogs);
    if (userId) {
      return await query.where(eq(securityLogs.userId, userId)).orderBy(desc(securityLogs.createdAt));
    }
    return await query.orderBy(desc(securityLogs.createdAt));
  }

  // Poll operations
  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [newPoll] = await db
      .insert(polls)
      .values(poll)
      .returning();
    return newPoll;
  }

  async getPoll(pollId: string): Promise<Poll | undefined> {
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.pollId, pollId));
    return poll || undefined;
  }

  async getActivePolls(): Promise<Poll[]> {
    return await db
      .select()
      .from(polls)
      .where(eq(polls.isActive, true))
      .orderBy(desc(polls.createdAt));
  }

  async closePoll(pollId: string): Promise<void> {
    await db
      .update(polls)
      .set({ isActive: false, closedAt: new Date() })
      .where(eq(polls.pollId, pollId));
  }

  // Poll vote operations
  async createPollVote(vote: InsertPollVote): Promise<PollVote> {
    const [newVote] = await db
      .insert(pollVotes)
      .values(vote)
      .returning();
    return newVote;
  }

  async getPollVotes(pollId: string): Promise<PollVote[]> {
    return await db
      .select()
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId))
      .orderBy(desc(pollVotes.createdAt));
  }

  async getUserPollVote(pollId: string, userId: string): Promise<PollVote | undefined> {
    const [vote] = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
    return vote || undefined;
  }

  // Rate limit operations
  async getRateLimit(userId: string): Promise<RateLimit | undefined> {
    const [rateLimit] = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.userId, userId));
    return rateLimit || undefined;
  }

  async updateRateLimit(userId: string, updates: Partial<RateLimit>): Promise<RateLimit> {
    const [rateLimit] = await db
      .update(rateLimits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rateLimits.userId, userId))
      .returning();
    return rateLimit;
  }

  async createRateLimit(rateLimit: InsertRateLimit): Promise<RateLimit> {
    const [newRateLimit] = await db
      .insert(rateLimits)
      .values(rateLimit)
      .returning();
    return newRateLimit;
  }

  // Application operations
  async createApplication(application: InsertApplication): Promise<Application> {
    const [app] = await db
      .insert(applications)
      .values(application)
      .returning();
    return app;
  }

  async getApplication(applicationId: string): Promise<Application | undefined> {
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.applicationId, applicationId));
    return application || undefined;
  }

  async getPendingApplications(): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.status, 'pending'))
      .orderBy(desc(applications.createdAt));
  }

  async updateApplication(applicationId: string, updates: Partial<Application>): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set(updates)
      .where(eq(applications.applicationId, applicationId))
      .returning();
    return application || undefined;
  }

  // Auction operations
  async createAuction(auction: InsertAuction): Promise<Auction> {
    const [newAuction] = await db
      .insert(auctions)
      .values(auction)
      .returning();
    return newAuction;
  }

  async getAuction(auctionId: string): Promise<Auction | undefined> {
    const [auction] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.auctionId, auctionId));
    return auction || undefined;
  }

  async getActiveAuctions(): Promise<Auction[]> {
    return await db
      .select()
      .from(auctions)
      .where(eq(auctions.isActive, true))
      .orderBy(desc(auctions.createdAt));
  }

  async updateAuction(auctionId: string, updates: Partial<Auction>): Promise<Auction | undefined> {
    const [auction] = await db
      .update(auctions)
      .set(updates)
      .where(eq(auctions.auctionId, auctionId))
      .returning();
    return auction || undefined;
  }
}

export const storage = new DatabaseStorage();
