# Discord Anonymous Bot

A comprehensive Discord bot with anonymous messaging capabilities, advanced security features, and community tools.

## Features

### Core Functionality
- **Anonymous Messaging**: Send messages anonymously with terminal-style formatting
- **Multiple Input Methods**: Use `/anon` slash command, `@anon` prefix, or DM the bot
- **Terminal Styling**: Messages appear in green terminal-style code blocks

### Security & Moderation
- **Profanity Filter**: Multi-language content filtering
- **Rate Limiting**: Prevents spam and abuse
- **Security Monitoring**: Detects suspicious patterns and threats
- **Comprehensive Logging**: All actions logged to moderation channel
- **Role-based Permissions**: Control who can send anonymous messages

### Community Features
- **Polls**: Create and vote in community polls
- **Announcements**: Admin-only announcement system
- **Payment Integration**: PayPal and UPI payment links
- **Status Commands**: Check bot health and uptime

### Database Integration
- **PostgreSQL**: Persistent data storage with Drizzle ORM
- **User Management**: Track Discord users and permissions
- **Message Logging**: Store anonymous messages with metadata
- **Security Logs**: Audit trail for all security events

## Setup Instructions

### 1. Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Set the token in Replit Secrets as `DISCORD_BOT_TOKEN`

### 2. Bot Permissions
Add the bot to your server with these permissions:
- Send Messages
- Read Message History
- Use Slash Commands
- Manage Messages (for deleting original messages)
- View Channels

### 3. Channel Configuration
Update these channel IDs in your environment variables:
- `ANONYMOUS_CHANNEL`: Where anonymous messages appear
- `MOD_CHANNEL`: Where logs are sent
- `ALLOWED_ROLE_ID`: Role that can send anonymous messages
- `ADMIN_ROLE_ID`: Role that can use admin commands

## Available Commands

### Slash Commands
- `/anon <message>` - Send an anonymous message
- `/poll <question> <options>` - Create a poll (comma-separated options)
- `/vote <poll_id> <option>` - Vote in a poll
- `/pollresults <poll_id>` - View poll results
- `/announce <message>` - Send announcement (admin only)
- `/paypal` - Get PayPal payment link
- `/qr` - Get UPI payment information
- `/status` - Check bot status
- `/clear` - Clear anonymous channel (admin only)

### Text Commands
- `@anon <message>` - Send anonymous message from any channel
- `!status` - Check bot status
- `!help` - Show help information

### DM Support
Send a direct message to the bot to post anonymously.

## Security Features

### Content Filtering
- Comprehensive profanity filter
- Support for multiple languages
- Blocks offensive and inappropriate content

### Rate Limiting
- Maximum 5 messages per minute per user
- Automatic rate limit enforcement
- Security alerts for violations

### Threat Detection
- Discord invite link detection
- External link filtering (except PayPal)
- Mass mention prevention
- Suspicious keyword detection
- Character spam prevention

## Environment Variables

Required:
- `DISCORD_BOT_TOKEN` - Your Discord bot token

Optional (with defaults):
- `ANONYMOUS_CHANNEL` - Anonymous message channel ID
- `MOD_CHANNEL` - Moderation log channel ID
- `ALLOWED_ROLE_ID` - Role that can send anonymous messages
- `ADMIN_ROLE_ID` - Role with admin permissions
- `ROLE_NAME` - Protected role name (default: "Admin")

## Database Schema

The bot uses PostgreSQL with these tables:
- `users` - Discord user data and permissions
- `anonymous_messages` - Message tracking and metadata
- `security_logs` - Security events and violations
- `polls` - Community polls and voting
- `poll_votes` - Individual vote tracking
- `rate_limits` - User rate limiting data
- `applications` - User applications (future feature)
- `auctions` - Marketplace auctions (future feature)

## Running the Bot

The bot runs automatically in Replit. Just provide your `DISCORD_BOT_TOKEN` in the Secrets tab and the bot will connect to Discord.

## Support

If you need help setting up the bot:
1. Check that your Discord bot token is valid
2. Ensure the bot has proper permissions in your server
3. Verify channel IDs are correct
4. Check the console logs for any error messages

The bot includes comprehensive logging to help with troubleshooting.