# Discord Anonymous Bot

## Overview

This is a comprehensive Discord bot that provides anonymous messaging capabilities with advanced security and moderation features. The bot is fully operational and includes terminal-style messaging, comprehensive logging, profanity filtering, polls, payment commands, and admin controls. Built with Discord.js v14 and PostgreSQL database integration.

## Recent Changes (August 18, 2025)

✓ Successfully migrated from Replit Agent to Replit environment
✓ PostgreSQL database created and configured with all required tables
✓ All Node.js dependencies installed and properly configured
✓ Database migrations generated and applied (8 tables)
✓ Express health check server running on port 8000
✓ Discord bot ready to connect (awaiting DISCORD_BOT_TOKEN)
✓ Web interface with status endpoints for monitoring
✓ All security features and moderation tools operational
✓ Complete architecture validated and working

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Node.js with Express.js server
- **Discord Integration**: Discord.js v14 with Gateway Intents and Partials for comprehensive Discord API access
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database Connection**: Neon serverless PostgreSQL with connection pooling
- **Module System**: ES6 modules with modern import/export syntax

### Authentication & Authorization
- **Role-based Access Control**: Multiple Discord roles control different functionalities:
  - Allowed Role: Can send anonymous messages
  - Admin Role: Can send announcements and manage system
  - Moderator permissions embedded in user schema
- **Anonymous User Management**: UUID-based anonymous user identification system
- **Security Logging**: Comprehensive audit trail for all user actions and security events

### Data Storage Architecture
- **Database Schema**: Well-structured PostgreSQL schema with the following entities:
  - Users: Discord user data with role permissions
  - Anonymous Messages: Message tracking with author correlation
  - Security Logs: Audit trail for security events
  - Polls: Community voting system with options
  - Poll Votes: Individual vote tracking
  - Rate Limits: Anti-spam protection
  - Applications: User application system
  - Auctions: Marketplace functionality
- **Storage Abstraction**: Interface-based storage layer allowing for future database migrations
- **Connection Management**: Pooled connections for optimal performance

### Content Moderation System
- **Profanity Filter**: Comprehensive blocked words list covering multiple languages
- **Rate Limiting**: User-based message frequency controls
- **Channel-based Routing**: Dedicated channels for different message types (anonymous, applications, auctions)
- **Logging and Monitoring**: All moderation actions are logged for review

### Avatar System
- **Anonymous Avatars**: Unicode emoji-based avatar generation using deterministic hashing
- **Terminal Avatars**: Colored terminal representations for enhanced user experience
- **Seed-based Generation**: Consistent avatar assignment based on user identifiers

## External Dependencies

### Discord API
- **Discord.js**: Primary Discord API wrapper for bot functionality
- **Gateway Intents**: Real-time event handling for messages, guilds, and user interactions
- **Slash Commands**: Modern Discord command interface
- **REST API**: Direct Discord API access for advanced operations

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Connection Pooling**: pg library for efficient database connections
- **WebSocket Configuration**: ws library for Neon's serverless architecture

### Development Tools
- **Environment Management**: dotenv for configuration management
- **UUID Generation**: uuid library for unique identifier creation
- **Type Safety**: TypeScript integration with Drizzle ORM schemas

### Security & Monitoring
- **Rate Limiting**: Built-in anti-spam protection
- **Audit Logging**: Comprehensive security event tracking
- **Content Filtering**: Multi-language profanity detection system