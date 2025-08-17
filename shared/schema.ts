import { pgTable, serial, text, timestamp, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table for Discord user data
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  discordId: varchar('discord_id', { length: 20 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull(),
  discriminator: varchar('discriminator', { length: 4 }),
  avatar: text('avatar'),
  isAdmin: boolean('is_admin').default(false),
  isModerator: boolean('is_moderator').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Anonymous messages table
export const anonymousMessages = pgTable('anonymous_messages', {
  id: serial('id').primaryKey(),
  messageId: varchar('message_id', { length: 20 }).notNull().unique(),
  channelId: varchar('channel_id', { length: 20 }).notNull(),
  guildId: varchar('guild_id', { length: 20 }).notNull(),
  authorId: varchar('author_id', { length: 20 }).notNull(),
  content: text('content').notNull(),
  userId: text('user_id').notNull(), // Generated anonymous user ID
  createdAt: timestamp('created_at').defaultNow()
});

// Security logs table
export const securityLogs = pgTable('security_logs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 20 }).notNull(),
  username: varchar('username', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  threat: varchar('threat', { length: 100 }),
  content: text('content'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow()
});

// Polls table
export const polls = pgTable('polls', {
  id: serial('id').primaryKey(),
  pollId: varchar('poll_id', { length: 50 }).notNull().unique(),
  messageId: varchar('message_id', { length: 20 }).notNull(),
  channelId: varchar('channel_id', { length: 20 }).notNull(),
  guildId: varchar('guild_id', { length: 20 }).notNull(),
  createdBy: varchar('created_by', { length: 20 }).notNull(),
  question: text('question').notNull(),
  options: text('options').notNull(), // JSON string
  votes: text('votes').notNull(), // JSON string
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  closedAt: timestamp('closed_at')
});

// Poll votes table
export const pollVotes = pgTable('poll_votes', {
  id: serial('id').primaryKey(),
  pollId: varchar('poll_id', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 20 }).notNull(),
  optionIndex: integer('option_index').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Rate limiting table
export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 20 }).notNull().unique(),
  messageCount: integer('message_count').default(0),
  lastReset: timestamp('last_reset').defaultNow(),
  isBlocked: boolean('is_blocked').default(false),
  blockedUntil: timestamp('blocked_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Applications table
export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  applicationId: varchar('application_id', { length: 50 }).notNull().unique(),
  userId: varchar('user_id', { length: 20 }).notNull(),
  username: varchar('username', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'membership', 'staff', etc.
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'approved', 'rejected'
  reviewedBy: varchar('reviewed_by', { length: 20 }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow()
});

// Auctions table
export const auctions = pgTable('auctions', {
  id: serial('id').primaryKey(),
  auctionId: varchar('auction_id', { length: 50 }).notNull().unique(),
  messageId: varchar('message_id', { length: 20 }).notNull(),
  channelId: varchar('channel_id', { length: 20 }).notNull(),
  sellerId: varchar('seller_id', { length: 20 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  startingPrice: integer('starting_price').notNull(),
  currentPrice: integer('current_price').notNull(),
  buyoutPrice: integer('buyout_price'),
  highestBidderId: varchar('highest_bidder_id', { length: 20 }),
  endTime: timestamp('end_time').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  anonymousMessages: many(anonymousMessages),
  securityLogs: many(securityLogs),
  polls: many(polls),
  pollVotes: many(pollVotes),
  applications: many(applications),
  auctions: many(auctions)
}));

export const anonymousMessagesRelations = relations(anonymousMessages, ({ one }) => ({
  author: one(users, {
    fields: [anonymousMessages.authorId],
    references: [users.discordId]
  })
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  creator: one(users, {
    fields: [polls.createdBy],
    references: [users.discordId]
  }),
  votes: many(pollVotes)
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.pollId]
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.discordId]
  })
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  applicant: one(users, {
    fields: [applications.userId],
    references: [users.discordId]
  }),
  reviewer: one(users, {
    fields: [applications.reviewedBy],
    references: [users.discordId]
  })
}));

export const auctionsRelations = relations(auctions, ({ one }) => ({
  seller: one(users, {
    fields: [auctions.sellerId],
    references: [users.discordId]
  }),
  highestBidder: one(users, {
    fields: [auctions.highestBidderId],
    references: [users.discordId]
  })
}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AnonymousMessage = typeof anonymousMessages.$inferSelect;
export type InsertAnonymousMessage = typeof anonymousMessages.$inferInsert;
export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = typeof securityLogs.$inferInsert;
export type Poll = typeof polls.$inferSelect;
export type InsertPoll = typeof polls.$inferInsert;
export type PollVote = typeof pollVotes.$inferSelect;
export type InsertPollVote = typeof pollVotes.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = typeof auctions.$inferInsert;
