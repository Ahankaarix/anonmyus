CREATE TABLE "anonymous_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" varchar(20) NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"author_id" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "anonymous_messages_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" varchar(50) NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"username" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"reviewed_by" varchar(20),
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" serial PRIMARY KEY NOT NULL,
	"auction_id" varchar(50) NOT NULL,
	"message_id" varchar(20) NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"seller_id" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"starting_price" integer NOT NULL,
	"current_price" integer NOT NULL,
	"buyout_price" integer,
	"highest_bidder_id" varchar(20),
	"end_time" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "auctions_auction_id_unique" UNIQUE("auction_id")
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" varchar(50) NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"option_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" varchar(50) NOT NULL,
	"message_id" varchar(20) NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"created_by" varchar(20) NOT NULL,
	"question" text NOT NULL,
	"options" text NOT NULL,
	"votes" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"closed_at" timestamp,
	CONSTRAINT "polls_poll_id_unique" UNIQUE("poll_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"message_count" integer DEFAULT 0,
	"last_reset" timestamp DEFAULT now(),
	"is_blocked" boolean DEFAULT false,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "rate_limits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "security_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"username" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"threat" varchar(100),
	"content" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" varchar(20) NOT NULL,
	"username" varchar(100) NOT NULL,
	"discriminator" varchar(4),
	"avatar" text,
	"is_admin" boolean DEFAULT false,
	"is_moderator" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
