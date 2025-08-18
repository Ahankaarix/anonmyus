import express from "express";
import { config } from "dotenv";
import { Client, GatewayIntentBits, Events, Partials, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import sharp from 'sharp';
import fetch from 'node-fetch';

// Load environment variables
config();

const app = express();

// Environment variables
const anonymousChannel = process.env.ANONYMOUS_CHANNEL || "1406547609996361869";
const roleName = process.env.ROLE_NAME || "Admin";
const allowedRoleId = process.env.ALLOWED_ROLE_ID || "1384805029369876561"; // Role that can send anonymous messages
const adminRoleId = process.env.ADMIN_ROLE_ID || "1210529711843708929"; // Role that can send announcements
const superAdminIds = ["959692217885294632"]; // Super admin user IDs with full access
const modChannel = process.env.MOD_CHANNEL || ""; // Default log channel
const applicationChannel = "1406725485831913545"; // Applications review channel
const auctionChannel = process.env.AUCTION_CHANNEL || anonymousChannel; // Auction listings channel
const token = "";

// Blocked words list - profanity filter
const blockedWords = [
    "fuck", "fuk", "fck", "fukkk", "f.u.c.k", "fucc", "fuxk",
    "shit", "sh1t", "sh!t", "shet", "shyt",
    "bitch", "b!tch", "bi7ch", "btch", "bich",
    "asshole", "a$$hole", "azzhole", "ashole",
    "dick", "d1ck", "dik", "diq", "deek",
    "cock", "c0ck", "cok", "coq",
    "pussy", "pussi", "pusy", "p00sy",
    "bastard", "bastrd", "ba$tard", "bstrd",
    "slut", "slutt", "sl@t", "slutty",
    "whore", "whoar", "w.h.o.r.e", "h0e", "hoe",
    "faggot", "f@g", "fa66ot", "phag", "fag",
    "cunt", "c*nt", "cnt", "kunt",
    "nigger", "n1gger", "nigg3r", "nigga", "niga",
    "motherfucker", "m0therfuker", "muthafucka", "mf", "m.f.",
    "madarchod", "m@darchod", "m4darchod", "m.c.", "mc",
    "behenchod", "bhenchod", "bhnchod", "b.c.", "bc",
    "chutiya", "chutya", "chutia", "ch@tiya", "chut",
    "gandu", "gaandu", "g@ndu", "g4ndu",
    "randi", "r@ndi", "raandi",
    "launda", "lund", "l0nd", "lundd",
    "lavda", "lawda", "laveda",
    "suar", "sooar", "suwar", "swr",
    "kutta", "kutti", "kuttiya", "kutte", "kutt@",
    "harami", "haramzade", "haramzada",
    "bhosdike", "bhosri", "bhosda", "bhosriwala",
    "chodu", "chod", "chodna", "chodenge",
    "tatti", "t@tti", "tatty",
    "gaand", "gand", "g@nd", "g4and"
];

// Function to check for blocked words
function containsBlockedWords(text) {
    const lowerText = text.toLowerCase();
    return blockedWords.some(word => {
        const lowerWord = word.toLowerCase();
        // Check for exact word matches and words with boundaries
        const regex = new RegExp(`\\b${lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(lowerText) || lowerText.includes(lowerWord);
    });
}

// Create terminal-style anonymous message
function createTerminalAnonymousMessage(content) {
    const userId = generateAnonUserId();
    return `\`\`\`ansi\n\u001b[32m${userId}: ${content}\n\`\`\``;
}

// Generate automatic anonymous user ID
function generateAnonUserId() {
    const prefixes = ['shadow', 'ghost', 'phantom', 'cipher', 'void', 'nexus', 'omega', 'alpha', 'delta', 'echo'];
    const numbers = Math.floor(Math.random() * 999) + 1;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix}_${numbers.toString().padStart(3, '0')}`;
}

// Generate hacker-style user ID for auction system
function generateHackerUserId() {
    const prefixes = ['user', 'hacker', 'trader', 'buyer', 'seller', 'agent', 'client'];
    const numbers = Math.floor(Math.random() * 9999) + 1000;
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${numbers}`;
}

// Resize image to 150x150 using Sharp
async function resizeImageTo150x150(imageUrl) {
    try {
        console.log(`🔄 Fetching image from: ${imageUrl}`);
        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.error('❌ Failed to fetch image:', response.status);
            return null;
        }
        
        const imageBuffer = await response.buffer();
        console.log(`📐 Resizing image to 150x150...`);
        const resizedBuffer = await sharp(imageBuffer)
            .resize(150, 150, { 
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 85 })
            .toBuffer();
        
        console.log(`✅ Image resized successfully, size: ${resizedBuffer.length} bytes`);
        return resizedBuffer;
    } catch (error) {
        console.error('❌ Error resizing image:', error.message);
        return null;
    }
}

// In-memory storage for polls (in production, use a database)
const activePolls = new Map();
const userVotes = new Map(); // Track user votes to prevent duplicate voting

// In-memory storage for auction system
const activeAuctions = new Map(); // auctionId -> auction data
const pendingApplications = new Map(); // applicationId -> application data
const userApplications = new Map(); // userId -> applicationId
const approvedUsers = new Set(); // Set of approved user IDs

// Security monitoring
const securityLogs = new Map();
const rateLimits = new Map(); // Rate limiting for security

// Enhanced security check
function checkSecurityThreat(message, userId) {
    const suspiciousPatterns = [
        /discord\.gg\/[a-zA-Z0-9]+/i, // Discord invite links
        /http[s]?:\/\/(?!paypal\.me)/i, // External links (except PayPal)
        /@everyone|@here/i, // Mass mentions
        /\b(hack|exploit|ddos|bot|spam)\b/i, // Suspicious keywords
        /(.)\1{10,}/i // Character spam
    ];
    
    const now = Date.now();
    const userRate = rateLimits.get(userId) || { count: 0, timestamp: now };
    
    // Rate limiting check (max 5 messages per minute)
    if (now - userRate.timestamp < 60000) {
        userRate.count++;
        if (userRate.count > 5) {
            return { threat: true, reason: 'Rate limit exceeded' };
        }
    } else {
        userRate.count = 1;
        userRate.timestamp = now;
    }
    rateLimits.set(userId, userRate);
    
    // Pattern matching
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(message)) {
            return { threat: true, reason: 'Suspicious content detected' };
        }
    }
    
    return { threat: false };
}



// Validate required environment variables
if (!token) {
    console.log("❌ Please set DISCORD_BOT_TOKEN environment variable");
    console.log("📝 The bot will still start but won't be able to connect to Discord");
    console.log("🔗 Get your token from: https://discord.com/developers/applications");
}

// Create Discord client with basic intents only
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages
    ]
});

// Function to clear channel and send startup sequence
async function clearChannelAndStartup() {
    try {
        const anonChannel = await client.channels.fetch(anonymousChannel);
        
        // Clear all messages in the channel (bot restart = clean slate)
        let fetched;
        do {
            fetched = await anonChannel.messages.fetch({ limit: 100 });
            if (fetched.size > 0) {
                // Filter messages that can be bulk deleted (less than 14 days old)
                const bulkDeletable = fetched.filter(msg => msg.createdTimestamp > Date.now() - 1209600000);
                const oldMessages = fetched.filter(msg => msg.createdTimestamp <= Date.now() - 1209600000);
                
                // Bulk delete recent messages
                if (bulkDeletable.size > 0) {
                    await anonChannel.bulkDelete(bulkDeletable);
                }
                
                // Delete old messages individually
                for (const [id, message] of oldMessages) {
                    try {
                        await message.delete();
                        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit protection
                    } catch (err) {
                        console.log(`Could not delete message ${id}: ${err.message}`);
                    }
                }
            }
        } while (fetched.size >= 100);
        
        console.log('✅ Anonymous channel cleared successfully');
        
        // Send startup sequence with green color
        const startupMessages = [
            "```ansi",
            "\u001b[32m[BOOT] >> Initializing secure connection...",
            "\u001b[32m[BOOT] >> Handshake complete with NODE_001",
            "\u001b[32m[SYS]  >> Loading core modules ██████████ 100%",
            "\u001b[32m[NET]  >> Encrypted tunnel established [TLS v3.9]",
            "\u001b[32m[ID]   >> Identity mask engaged :: Layer-256 active",
            "\u001b[32m[SEC]  >> Firewall bypass injected... [SUCCESS]",
            "\u001b[32m",
            "\u001b[32m┌─────────────────────────────────────┐",
            "\u001b[32m│   🔐  S E C U R E   L O G I N  v3.1 │",
            "\u001b[32m└─────────────────────────────────────┘",
            "\u001b[32m",
            "\u001b[32m[USER] :: ANONYMOUS",
            "\u001b[32m[PASS] :: ********",
            "\u001b[32m",
            "\u001b[32m[AUTH] >> Authentication [VERIFIED]",
            "\u001b[32m[AUTH] >> Access Level = ROOT",
            "\u001b[32m",
            "\u001b[32m┌─────────────────────────────────────┐",
            "\u001b[32m│   W E L C O M E   B A C K ,         │",
            "\u001b[32m│   A N O N Y M O U S   O P E R A T I V E │",
            "\u001b[32m└─────────────────────────────────────┘",
            "\u001b[32m",
            "\u001b[32m[CHK] >> Running system diagnostics...",
            "\u001b[32m        ▸ Proxy Chain [OK]",
            "\u001b[32m        ▸ VPN Multi-Layer [OK]",
            "\u001b[32m        ▸ Spoof Engine [ACTIVE]",
            "\u001b[32m        ▸ Traceback : NULL",
            "\u001b[32m",
            "\u001b[32m[SYS]  >> Initialization ██████████ 100%",
            "\u001b[32m[ACCESS] >> GRANTED :: SESSION OPENED",
            "```"
        ];
        
        // Send startup sequence as one message
        await anonChannel.send(startupMessages.join('\n'));
        console.log('✅ Startup sequence sent to anonymous channel');
        
    } catch (error) {
        console.error('❌ Error clearing channel and sending startup sequence:', error.message);
    }
}

// Register slash commands
async function registerSlashCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('anon')
            .setDescription('Send an anonymous message')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The message to send anonymously')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('poll')
            .setDescription('Create a poll')
            .addStringOption(option =>
                option.setName('question')
                    .setDescription('The poll question')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('options')
                    .setDescription('Poll options separated by commas')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('announce')
            .setDescription('Send an announcement (admin only)')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The announcement message')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('status')
            .setDescription('Check bot status'),
        new SlashCommandBuilder()
            .setName('clear')
            .setDescription('Clear anonymous channel (admin only)'),
        new SlashCommandBuilder()
            .setName('vote')
            .setDescription('Vote in a poll')
            .addStringOption(option =>
                option.setName('poll_id')
                    .setDescription('The poll ID')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('option')
                    .setDescription('Option number to vote for')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('pollresults')
            .setDescription('View poll results')
            .addStringOption(option =>
                option.setName('poll_id')
                    .setDescription('The poll ID')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('paypal')
            .setDescription('Get PayPal payment link'),
        new SlashCommandBuilder()
            .setName('qr')
            .setDescription('Get UPI payment information'),
        new SlashCommandBuilder()
            .setName('sell')
            .setDescription('List an item for auction')
            .addStringOption(option =>
                option.setName('item')
                    .setDescription('Item name/description')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('price')
                    .setDescription('Starting price')
                    .setRequired(true))
            .addAttachmentOption(option =>
                option.setName('image')
                    .setDescription('Item image')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('bid')
            .setDescription('Place a bid on an auction')
            .addStringOption(option =>
                option.setName('auction_id')
                    .setDescription('Auction ID')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('amount')
                    .setDescription('Bid amount')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('apply')
            .setDescription('Submit application to participate in auctions')
            .addStringOption(option =>
                option.setName('fullname')
                    .setDescription('Your full real name')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('id_number')
                    .setDescription('SSN or Citizen ID number')
                    .setRequired(true))
            .addAttachmentOption(option =>
                option.setName('profile_picture')
                    .setDescription('Your profile picture for verification')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('auctions')
            .setDescription('View active auctions')
    ];

    try {
        const rest = new REST({ version: '10' }).setToken(token);
        
        console.log('🔄 Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
}

// Bot ready event
client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`📡 Anonymous channel: ${anonymousChannel}`);
    if (modChannel) console.log(`🛡️ Mod channel: ${modChannel}`);
    if (roleName) console.log(`👤 Protected role: ${roleName}`);
    if (allowedRoleId) console.log(`🔑 Required role ID: ${allowedRoleId}`);
    if (adminRoleId) console.log(`👑 Admin role ID: ${adminRoleId}`);
    console.log(`👨‍💻 Super Admin IDs: ${superAdminIds.join(', ')}`);
    
    // Auto-approve super admins for marketplace access
    superAdminIds.forEach(id => {
        approvedUsers.add(id);
    });
    console.log(`✅ Super admins granted marketplace access automatically`);
    if (allowedRoleId) console.log(`🔑 Required role ID: ${allowedRoleId}`);
    if (adminRoleId) console.log(`👑 Admin role ID: ${adminRoleId}`);
    
    // Clear channel and send startup sequence
    await clearChannelAndStartup();
    
    // Register slash commands
    await registerSlashCommands();
});

// Handle interactions (slash commands and buttons)
client.on(Events.InteractionCreate, async (interaction) => {
    // Handle button interactions
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === 'anon') {
            await handleAnonCommand(interaction);
        } else if (commandName === 'poll') {
            await handlePollCommand(interaction);
        } else if (commandName === 'vote') {
            await handleVoteCommand(interaction);
        } else if (commandName === 'pollresults') {
            await handlePollResultsCommand(interaction);
        } else if (commandName === 'announce') {
            await handleAnnouncementCommand(interaction);
        } else if (commandName === 'paypal') {
            await handlePaypalCommand(interaction);
        } else if (commandName === 'qr') {
            await handleQRCommand(interaction);
        } else if (commandName === 'status') {
            await handleStatusCommand(interaction);
        } else if (commandName === 'clear') {
            await handleClearCommand(interaction);
        } else if (commandName === 'sell') {
            await handleSellCommand(interaction);
        } else if (commandName === 'bid') {
            await handleBidCommand(interaction);
        } else if (commandName === 'apply') {
            await handleApplyCommand(interaction);
        } else if (commandName === 'auctions') {
            await handleAuctionsCommand(interaction);
        }
    } catch (error) {
        console.error('❌ Error handling slash command:', error.message);
        if (!interaction.replied) {
            await interaction.reply({ content: "❌ An error occurred while processing your command.", flags: 64 });
        }
    }
});

// Message handling
client.on(Events.MessageCreate, async (message) => {
    try {
        // Ignore bot messages
        if (message.author.bot) return;

        const channel = message.channel;
        const randomId = Math.floor(Math.random() * 100000);
        const date = new Date();
        const messageStamp = "#" + randomId + " " + date.toLocaleDateString();
        const messageContent = message.content || "[Message content unavailable]";

        // Handle DM messages
        if (channel.type === 1) {
            await handleDmMessage(message, messageStamp);
            return;
        }

        // Handle commands in any channel
        if (messageContent.startsWith('!')) {
            await handleCommand(message, messageStamp);
            return;
        }

        // Check for @anon pattern for simple anonymous messages in any channel
        if (messageContent.toLowerCase().startsWith('@anon ')) {
            const username = message.author.username || "Unknown User";
            const anonMessage = messageContent.substring(6).trim(); // Remove "@anon " prefix
            
            if (!anonMessage) {
                await message.reply("❌ Please provide a message after @anon");
                return;
            }

            // Enhanced security and content checks
            const securityCheck = checkSecurityThreat(anonMessage, message.author.id);
            if (securityCheck.threat) {
                await message.reply(`🛡️ Security Alert: ${securityCheck.reason}. Message blocked for safety.`);
                
                // Log security incident
                try {
                    const logChannel = await client.channels.fetch(modChannel);
                    await logChannel.send(`**🚨 SECURITY ALERT**\nUser: ${username} (${message.author.id})\nThreat: ${securityCheck.reason}\nTimestamp: ${new Date().toLocaleString()}\nBlocked Content: ${anonMessage}`);
                } catch (error) {
                    console.error('❌ Error logging security incident:', error.message);
                }
                return;
            }

            // Check for blocked words
            if (containsBlockedWords(anonMessage)) {
                await message.reply("❌ Message blocked due to inappropriate language. Please avoid using offensive words.");
                
                // Log abuse attempt
                try {
                    const logChannel = await client.channels.fetch(modChannel);
                    await logChannel.send(`**🚫 BLOCKED @ANON MESSAGE**\nUser: ${username} (${message.author.id})\nTimestamp: ${new Date().toLocaleString()}\nReason: Inappropriate language detected\nFrom Channel: #${message.channel.name} (${message.channel.id})\nBlocked Content: ${anonMessage}`);
                } catch (error) {
                    console.error('❌ Error logging blocked @anon message:', error.message);
                }
                return;
            }

            // Check if user has the required role to send anonymous messages
            if (allowedRoleId && !message.member?.roles.cache.has(allowedRoleId)) {
                await message.reply("❌ You don't have permission to send anonymous messages.");
                return;
            }

            // Check if user has protected role
            if (roleName && message.member?.roles.cache.some((role) => role.name === roleName)) {
                await message.reply("❌ Users with the admin role cannot send anonymous messages.");
                return;
            }

            // Delete the original message
            try {
                await message.delete();
            } catch (error) {
                console.log('Could not delete original message');
            }

            // Send terminal-style anonymous message to anonymous channel
            try {
                const anonChannel = await client.channels.fetch(anonymousChannel);
                const terminalMessage = createTerminalAnonymousMessage(anonMessage);
                await anonChannel.send(terminalMessage);

                // Log to mod channel
                try {
                    const logChannel = await client.channels.fetch(modChannel);
                    await logChannel.send(`**📝 ANONYMOUS MESSAGE LOG**\nUser: ${username} (${message.author.id})\n${messageStamp}\nFrom Channel: #${message.channel.name} (${message.channel.id})\nMessage: ${anonMessage}`);
                } catch (error) {
                    console.error('❌ Error logging @anon message:', error.message);
                }
            } catch (error) {
                console.error('❌ Error sending anonymous message:', error.message);
                await message.reply("❌ Could not send anonymous message. Please try again.");
            }

            return;
        }

        // Only process messages in the anonymous channel
        if (channel.id !== anonymousChannel) return;
        
        // Check if user has the required role to send anonymous messages
        if (allowedRoleId && !message.member?.roles.cache.has(allowedRoleId)) {
            await message.reply("❌ You don't have permission to send anonymous messages in this channel.");
            return;
        }

        // Check if user has protected role (admins can't send anonymous messages)
        if (roleName && message.member?.roles.cache.some((role) => role.name === roleName)) {
            await message.reply("❌ Users with the admin role cannot send anonymous messages.");
            return;
        }

        await handleChannelMessage(channel, message, messageStamp);
    } catch (error) {
        console.error('❌ Error in message handler:', error.message);
    }
});

// Handle DM messages
async function handleDmMessage(message, messageStamp) {
    try {
        const username = message.author.username || "Unknown User";
        const messageContent = message.content || "[Message content unavailable]";
        
        // Security and content checks
        const securityCheck = checkSecurityThreat(messageContent, message.author.id);
        if (securityCheck.threat) {
            await message.reply(`🛡️ Security Alert: ${securityCheck.reason}. Message blocked for safety.`);
            return;
        }
        
        if (containsBlockedWords(messageContent)) {
            await message.reply("❌ Message blocked due to inappropriate language. Please avoid using offensive words.");
            return;
        }
        
        // Send to anonymous channel
        const anonChannel = await client.channels.fetch(anonymousChannel);
        const terminalMessage = createTerminalAnonymousMessage(messageContent);
        await anonChannel.send(terminalMessage);
        
        // Confirm to user
        await message.reply("✅ Your anonymous message has been sent!");
        
        // Log to mod channel
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**📝 DM ANONYMOUS MESSAGE**\nUser: ${username} (${message.author.id})\nMessage: ${messageContent}\nTimestamp: ${new Date().toLocaleString()}`);
        } catch (error) {
            console.error('❌ Error logging DM message:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error handling DM message:', error.message);
        await message.reply("❌ Sorry, there was an error processing your message.");
    }
}

// Handle commands
async function handleCommand(message, messageStamp) {
    const args = message.content.slice(1).split(' ');
    const command = args[0].toLowerCase();
    
    try {
        switch (command) {
            case 'status':
                await message.reply(`✅ Bot is online!\n🕐 Uptime: ${Math.floor(process.uptime())} seconds\n📡 Ping: ${client.ws.ping}ms`);
                break;
                
            case 'help':
                const helpEmbed = {
                    color: 0x00ff00,
                    title: '🤖 Bot Commands',
                    description: 'Available commands:',
                    fields: [
                        { name: '!status', value: 'Check bot status', inline: true },
                        { name: '!help', value: 'Show this help message', inline: true },
                        { name: '@anon <message>', value: 'Send anonymous message', inline: false },
                        { name: 'DM bot', value: 'Send anonymous message via DM', inline: false }
                    ],
                    timestamp: new Date()
                };
                await message.reply({ embeds: [helpEmbed] });
                break;
                
            default:
                await message.reply("❌ Unknown command. Use `!help` for available commands.");
        }
    } catch (error) {
        console.error('❌ Error handling command:', error.message);
        await message.reply("❌ Sorry, there was an error processing your command.");
    }
}

// Handle channel messages
async function handleChannelMessage(channel, message, messageStamp) {
    try {
        const username = message.author.username || "Unknown User";
        const messageContent = message.content || "[Message content unavailable]";
        
        // Check for blocked words
        if (containsBlockedWords(messageContent)) {
            await message.reply("❌ Message blocked due to inappropriate language. Please avoid using offensive words.");
            
            // Log abuse attempt
            try {
                const logChannel = await client.channels.fetch(modChannel);
                await logChannel.send(`**🚫 BLOCKED CHANNEL MESSAGE**\nUser: ${username} (${message.author.id})\nTimestamp: ${new Date().toLocaleString()}\nChannel: #${channel.name} (${channel.id})\nReason: Inappropriate language detected\nBlocked Content: ${messageContent}`);
            } catch (error) {
                console.error('❌ Error logging blocked message:', error.message);
            }
            return;
        }

        // Delete the original message
        try {
            await message.delete();
        } catch (error) {
            console.log('Could not delete original message');
        }

        // Create terminal-style anonymous message
        const anonymousMessage = createTerminalAnonymousMessage(messageContent);
        
        await channel.send(anonymousMessage);

        // Log to mod channel
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**📝 CHANNEL LOG**\nUser: ${username} (${message.author.id})\n${messageStamp}\nChannel: #${channel.name} (${channel.id})\nMessage: ${messageContent}`);
        } catch (error) {
            console.error('❌ Error logging channel message:', error.message);
        }
    } catch (error) {
        console.error('❌ Error handling channel message:', error.message);
    }
}

// Handle /anon slash command
async function handleAnonCommand(interaction) {
    const message = interaction.options.getString('message');
    const username = interaction.user.username || "Unknown User";
    
    // Check for blocked words
    if (containsBlockedWords(message)) {
        await interaction.reply({ content: "❌ Message blocked due to inappropriate language. Please avoid using offensive words.", flags: 64 });
        return;
    }

    // Check if user has the required role
    if (allowedRoleId && !interaction.member?.roles.cache.has(allowedRoleId)) {
        await interaction.reply({ content: "❌ You don't have permission to send anonymous messages.", flags: 64 });
        return;
    }

    // Check if user has protected role
    if (roleName && interaction.member?.roles.cache.some((role) => role.name === roleName)) {
        await interaction.reply({ content: "❌ Users with the admin role cannot send anonymous messages.", flags: 64 });
        return;
    }

    try {
        const anonChannel = await client.channels.fetch(anonymousChannel);
        const terminalMessage = createTerminalAnonymousMessage(message);
        await anonChannel.send(terminalMessage);
        
        await interaction.reply({ content: "✅ Your anonymous message has been sent!", flags: 64 });

        // Log to mod channel
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**📝 /ANON COMMAND LOG**\nUser: ${username} (${interaction.user.id})\nTimestamp: ${new Date().toLocaleString()}\nMessage: ${message}`);
        } catch (error) {
            console.error('❌ Error logging /anon command:', error.message);
        }
    } catch (error) {
        console.error('❌ Error sending anonymous message:', error.message);
        await interaction.reply({ content: "❌ Could not send anonymous message. Please try again.", flags: 64 });
    }
}

// Handle /poll slash command
async function handlePollCommand(interaction) {
    const question = interaction.options.getString('question');
    const optionsString = interaction.options.getString('options');
    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
    
    if (options.length < 2) {
        await interaction.reply({ content: "❌ Please provide at least 2 options separated by commas.", flags: 64 });
        return;
    }
    
    if (options.length > 10) {
        await interaction.reply({ content: "❌ Maximum 10 options allowed.", flags: 64 });
        return;
    }
    
    const pollId = Math.random().toString(36).substring(7);
    const poll = {
        id: pollId,
        question: question,
        options: options,
        votes: new Array(options.length).fill(0),
        creator: interaction.user.id,
        createdAt: new Date()
    };
    
    activePolls.set(pollId, poll);
    
    let pollMessage = `**📊 POLL: ${question}**\n\n`;
    options.forEach((option, index) => {
        pollMessage += `${index + 1}. ${option}\n`;
    });
    pollMessage += `\nUse \`/vote ${pollId} <option_number>\` to vote`;
    pollMessage += `\nPoll ID: \`${pollId}\``;
    
    await interaction.reply(pollMessage);
}

// Handle /vote slash command
async function handleVoteCommand(interaction) {
    const pollId = interaction.options.getString('poll_id');
    const optionNumber = interaction.options.getInteger('option');
    const userId = interaction.user.id;
    
    const poll = activePolls.get(pollId);
    if (!poll) {
        await interaction.reply({ content: "❌ Poll not found.", flags: 64 });
        return;
    }
    
    if (optionNumber < 1 || optionNumber > poll.options.length) {
        await interaction.reply({ content: `❌ Invalid option. Choose between 1 and ${poll.options.length}.`, flags: 64 });
        return;
    }
    
    const voteKey = `${pollId}_${userId}`;
    if (userVotes.has(voteKey)) {
        await interaction.reply({ content: "❌ You have already voted in this poll.", flags: 64 });
        return;
    }
    
    poll.votes[optionNumber - 1]++;
    userVotes.set(voteKey, optionNumber);
    
    await interaction.reply({ content: `✅ Your vote for "${poll.options[optionNumber - 1]}" has been recorded!`, flags: 64 });
}

// Handle /pollresults slash command
async function handlePollResultsCommand(interaction) {
    const pollId = interaction.options.getString('poll_id');
    
    const poll = activePolls.get(pollId);
    if (!poll) {
        await interaction.reply({ content: "❌ Poll not found.", flags: 64 });
        return;
    }
    
    const totalVotes = poll.votes.reduce((sum, votes) => sum + votes, 0);
    
    let resultsMessage = `**📊 POLL RESULTS: ${poll.question}**\n\n`;
    poll.options.forEach((option, index) => {
        const votes = poll.votes[index];
        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
        resultsMessage += `${index + 1}. ${option}: ${votes} votes (${percentage}%)\n`;
    });
    resultsMessage += `\nTotal votes: ${totalVotes}`;
    resultsMessage += `\nPoll ID: \`${pollId}\``;
    
    await interaction.reply(resultsMessage);
}

// Admin permission check
function hasAdminPermissions(interaction) {
    const member = interaction.member;
    if (!member) return false;
    
    // Check if user is super admin
    if (superAdminIds.includes(interaction.user.id)) return true;
    
    // Check if user has admin role
    return member.roles.cache.has(adminRoleId) || member.permissions.has("Administrator");
}

// Handle /announce slash command
async function handleAnnouncementCommand(interaction) {
    // Check if user has admin permissions
    if (!hasAdminPermissions(interaction)) {
        await interaction.reply({ content: "❌ You don't have permission to send announcements.", flags: 64 });
        return;
    }
    
    const message = interaction.options.getString('message');
    const username = interaction.user.username || "Unknown User";
    
    try {
        const announcement = `**📢 ANNOUNCEMENT**\n\n${message}\n\n*Sent by: ${username}*`;
        await interaction.channel.send(announcement);
        await interaction.reply({ content: "✅ Announcement sent!", flags: 64 });
        
        // Log announcement
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**📢 ANNOUNCEMENT LOG**\nUser: ${username} (${interaction.user.id})\nTimestamp: ${new Date().toLocaleString()}\nChannel: #${interaction.channel.name} (${interaction.channel.id})\nAnnouncement: ${message}`);
        } catch (error) {
            console.error('❌ Error logging announcement:', error.message);
        }
    } catch (error) {
        console.error('❌ Error sending announcement:', error.message);
        await interaction.reply({ content: "❌ Could not send announcement. Please try again.", flags: 64 });
    }
}

// Handle PayPal command
async function handlePaypalCommand(interaction) {
    const username = interaction.user.username || "Unknown User";
    
    try {
        const paypalMessage = `\`\`\`ansi
\u001b[32m💳 PAYMENT GATEWAY ACCESSED
\u001b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\u001b[32m[SYSTEM] Secure PayPal connection established
\u001b[32m[INFO] Payment Method: PayPal
\u001b[32m[LINK] https://paypal.me/DavidBarma
\u001b[32m[STATUS] Connection secure ✓
\u001b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\``;
        
        await interaction.reply({ content: paypalMessage, flags: 64 });
        
        // Log payment request
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**💳 PAYPAL REQUEST LOG**\nUser: ${username} (${interaction.user.id})\nTimestamp: ${new Date().toLocaleString()}\nChannel: #${interaction.channel.name} (${interaction.channel.id})`);
        } catch (error) {
            console.error('❌ Error logging PayPal request:', error.message);
        }
    } catch (error) {
        console.error('❌ Error handling PayPal command:', error.message);
        await interaction.reply({ content: "❌ Could not retrieve payment information. Please try again.", flags: 64 });
    }
}

// Handle QR/UPI command
async function handleQRCommand(interaction) {
    const username = interaction.user.username || "Unknown User";
    
    try {
        const upiMessage = `\`\`\`ansi
\u001b[32m📱 UPI PAYMENT GATEWAY
\u001b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\u001b[32m[SYSTEM] Secure UPI connection established
\u001b[32m[INFO] Payment Method: UPI/QR Code
\u001b[32m[UPI ID] davidbarma19-4@okicici
\u001b[32m[STATUS] Connection secure ✓
\u001b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\``;
        
        await interaction.reply({ content: upiMessage, flags: 64 });
        
        // Log UPI request
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**📱 UPI REQUEST LOG**\nUser: ${username} (${interaction.user.id})\nTimestamp: ${new Date().toLocaleString()}\nChannel: #${interaction.channel.name} (${interaction.channel.id})`);
        } catch (error) {
            console.error('❌ Error logging UPI request:', error.message);
        }
    } catch (error) {
        console.error('❌ Error handling QR command:', error.message);
        await interaction.reply({ content: "❌ Could not retrieve payment information. Please try again.", flags: 64 });
    }
}

// Handle status command
async function handleStatusCommand(interaction) {
    await interaction.reply(`✅ Bot is online!\n🕐 Uptime: ${Math.floor(process.uptime())} seconds\n📡 Ping: ${client.ws.ping}ms`);
}

// Handle clear command
async function handleClearCommand(interaction) {
    // Check if user has admin permissions
    if (!hasAdminPermissions(interaction)) {
        await interaction.reply({ content: "❌ You don't have permission to clear the channel.", flags: 64 });
        return;
    }

    try {
        await clearChannelAndStartup();
        await interaction.reply({ content: "✅ Anonymous channel cleared and restarted!", flags: 64 });
    } catch (error) {
        console.error('❌ Error clearing channel:', error.message);
        await interaction.reply({ content: "❌ Could not clear channel. Please try again.", flags: 64 });
    }
}

// Handle /sell command - List item for auction
async function handleSellCommand(interaction) {
    const item = interaction.options.getString('item');
    const price = interaction.options.getInteger('price');
    const image = interaction.options.getAttachment('image');
    const userId = interaction.user.id;
    const username = interaction.user.username || "Unknown User";

    // Auto-approve super admins if not already approved
    if (superAdminIds.includes(userId)) {
        approvedUsers.add(userId);
    }

    // Check if user has already submitted application
    if (!approvedUsers.has(userId)) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[31m[ACCESS_DENIED] >> UNAUTHORIZED TERMINAL ACCESS
\u001b[31m[ERROR] >> User not verified for marketplace operations
\u001b[31m[SYSTEM] >> Application required for secure transactions
\u001b[31m[CMD] >> Execute: /apply with real credentials
\u001b[31m[WARNING] >> Fake info = permanent ban from all networks
\`\`\``, 
            flags: 64 
        });
        return;
    }

    // Validate profile picture
    if (!profilePicture || !profilePicture.contentType?.startsWith('image/')) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[31m[ERROR] >> Invalid image file
\u001b[31m[REQUIRED] >> JPG, PNG, GIF formats only
\u001b[31m[ACTION] >> Upload valid image and try again
\`\`\``, 
            flags: 64 
        });
        return;
    }

    // Show processing message
    await interaction.deferReply({ flags: 64 });

    // Automatically resize image to 150x150
    const resizedImageBuffer = await resizeImageTo150x150(image.url);
    if (!resizedImageBuffer) {
        await interaction.editReply({ 
            content: `\`\`\`ansi
\u001b[31m[ERROR] >> Failed to process image
\u001b[31m[ACTION] >> Try uploading a different image
\`\`\``, 
            flags: 64 
        });
        return;
    }

    try {
        // Generate auction ID
        const auctionId = Math.random().toString(36).substring(7).toUpperCase();
        const hackerId = generateHackerUserId();

        // Create auction data
        const auction = {
            id: auctionId,
            hackerId: hackerId,
            sellerId: userId,
            sellerName: username,
            item: item,
            startingPrice: price,
            currentPrice: price,
            highestBidder: null,
            bids: [],
            imageUrl: image.url, // Keep original URL for now
            resizedImageBuffer: resizedImageBuffer, // Store resized buffer
            createdAt: new Date(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isActive: true
        };

        activeAuctions.set(auctionId, auction);

        // Send hacker-style auction listing
        const auctionMessage = `\`\`\`ansi
\u001b[32m[MARKETPLACE] >> NEW ITEM LISTED FOR AUCTION
\u001b[32m[SELLER] :: ${hackerId}
\u001b[32m[ITEM] >> ${item}
\u001b[32m[START_PRICE] >> $${price}
\u001b[32m[CURRENT_BID] >> $${price}
\u001b[32m[AUCTION_ID] >> ${auctionId}
\u001b[32m[STATUS] >> ACTIVE :: 24H TIMER INITIATED
\u001b[32m[SECURITY] >> VERIFIED SELLER :: SAFE TRANSACTION
\u001b[32m
\u001b[32m┌───────────────────────────────────────────────────────────────┐
\u001b[32m│  ⚡ PLACE BID: /bid ${auctionId} <amount>                        │
\u001b[32m└───────────────────────────────────────────────────────────────┘
\u001b[32m[WARNING] >> Must be verified to bid
\`\`\``;

        // Send to auction channel
        const auctionChannelObj = await client.channels.fetch(auctionChannel || anonymousChannel);
        const sentMessage = await auctionChannelObj.send({
            content: auctionMessage,
            files: [{
                attachment: resizedImageBuffer,
                name: `auction_${auctionId}_150x150.jpg`,
                description: `Resized auction image for ${item}`
            }]
        });

        auction.messageId = sentMessage.id;

        await interaction.editReply({ 
            content: `\`\`\`ansi
\u001b[32m[SUCCESS] >> Item listed successfully
\u001b[32m[AUCTION_ID] >> ${auctionId}
\u001b[32m[DURATION] >> 24 hours
\u001b[32m[STATUS] >> Live auction started
\u001b[32m[IMAGE] >> Auto-resized to 150x150 pixels
\`\`\``, 
            flags: 64 
        });

        // Log to mod channel
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**💰 NEW AUCTION CREATED**\nSeller: ${username} (${userId})\nItem: ${item}\nStarting Price: $${price}\nAuction ID: ${auctionId}\nTimestamp: ${new Date().toLocaleString()}`);
        } catch (error) {
            console.error('❌ Error logging auction creation:', error.message);
        }

    } catch (error) {
        console.error('❌ Error handling sell command:', error.message);
        await interaction.reply({ content: "❌ Could not create auction. Please try again.", flags: 64 });
    }
}

// Handle /bid command
async function handleBidCommand(interaction) {
    const auctionId = interaction.options.getString('auction_id').toUpperCase();
    const bidAmount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;
    const username = interaction.user.username || "Unknown User";

    // Auto-approve super admins if not already approved
    if (superAdminIds.includes(userId)) {
        approvedUsers.add(userId);
    }

    // Check if user is verified
    if (!approvedUsers.has(userId)) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[31m[ACCESS_DENIED] >> UNAUTHORIZED BID ATTEMPT
\u001b[31m[ERROR] >> User not verified for bidding operations
\u001b[31m[SYSTEM] >> Submit application: /apply
\u001b[31m[WARNING] >> Only verified users can participate
\`\`\``, 
            flags: 64 
        });
        return;
    }

    const auction = activeAuctions.get(auctionId);
    if (!auction || !auction.isActive) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[31m[ERROR] >> Auction not found or inactive
\u001b[31m[AUCTION_ID] >> ${auctionId}
\u001b[31m[STATUS] >> TERMINATED
\`\`\``, 
            flags: 64 
        });
        return;
    }

    // Check if bid is higher than current price
    if (bidAmount <= auction.currentPrice) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[31m[BID_REJECTED] >> Amount too low
\u001b[31m[CURRENT_BID] >> $${auction.currentPrice}
\u001b[31m[MINIMUM_BID] >> $${auction.currentPrice + 1}
\`\`\``, 
            flags: 64 
        });
        return;
    }

    // Check if user is trying to bid on their own auction
    if (auction.sellerId === userId) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[31m[ERROR] >> Cannot bid on your own auction
\u001b[31m[SECURITY] >> Self-bidding prohibited
\`\`\``, 
            flags: 64 
        });
        return;
    }

    try {
        // Update auction with new bid
        const hackerId = generateHackerUserId();
        auction.currentPrice = bidAmount;
        auction.highestBidder = userId;
        auction.highestBidderName = username;
        auction.bids.push({
            userId: userId,
            username: username,
            hackerId: hackerId,
            amount: bidAmount,
            timestamp: new Date()
        });

        // Update auction message
        const updatedMessage = `\`\`\`ansi
\u001b[32m[MARKETPLACE] >> AUCTION UPDATE
\u001b[32m[SELLER] :: ${auction.hackerId}
\u001b[32m[ITEM] >> ${auction.item}
\u001b[32m[START_PRICE] >> $${auction.startingPrice}
\u001b[32m[CURRENT_BID] >> $${bidAmount}
\u001b[32m[HIGHEST_BIDDER] :: ${hackerId}
\u001b[32m[AUCTION_ID] >> ${auctionId}
\u001b[32m[STATUS] >> ACTIVE :: ${Math.floor((auction.endTime - new Date()) / (1000 * 60 * 60))}H LEFT
\u001b[32m
\u001b[32m┌───────────────────────────────────────────────────────────────┐
\u001b[32m│  ⚡ OUTBID: /bid ${auctionId} <amount>                           │
\u001b[32m└───────────────────────────────────────────────────────────────┘
\u001b[32m[WARNING] >> Must be verified to bid
\`\`\``;

        // Update message in auction channel
        try {
            const auctionChannelObj = await client.channels.fetch(auctionChannel || anonymousChannel);
            const message = await auctionChannelObj.messages.fetch(auction.messageId);
            await message.edit(updatedMessage);
        } catch (error) {
            console.error('❌ Error updating auction message:', error.message);
        }

        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[32m[BID_ACCEPTED] >> Your bid has been placed
\u001b[32m[AMOUNT] >> $${bidAmount}
\u001b[32m[STATUS] >> Highest bidder
\u001b[32m[AUCTION_ID] >> ${auctionId}
\`\`\``, 
            flags: 64 
        });

        // Log to mod channel
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**💰 NEW BID PLACED**\nBidder: ${username} (${userId})\nAuction ID: ${auctionId}\nBid Amount: $${bidAmount}\nItem: ${auction.item}\nTimestamp: ${new Date().toLocaleString()}`);
        } catch (error) {
            console.error('❌ Error logging bid:', error.message);
        }

    } catch (error) {
        console.error('❌ Error handling bid command:', error.message);
        await interaction.reply({ content: "❌ Could not place bid. Please try again.", flags: 64 });
    }
}

// Handle /apply command
async function handleApplyCommand(interaction) {
    const fullname = interaction.options.getString('fullname');
    const idNumber = interaction.options.getString('id_number');
    const profilePicture = interaction.options.getAttachment('profile_picture');
    const userId = interaction.user.id;
    const username = interaction.user.username || "Unknown User";

    // Check if user already has pending application
    if (userApplications.has(userId)) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[33m[PENDING] >> Application already submitted
\u001b[33m[STATUS] >> Awaiting admin approval
\u001b[33m[WARNING] >> Do not submit duplicate applications
\`\`\``, 
            flags: 64 
        });
        return;
    }

    // Check if user is already approved
    if (approvedUsers.has(userId)) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[32m[VERIFIED] >> You are already approved
\u001b[32m[ACCESS] >> Full marketplace permissions
\u001b[32m[STATUS] >> Can sell and bid freely
\`\`\``, 
            flags: 64 
        });
        return;
    }

    try {
        // Generate application ID
        const applicationId = Math.random().toString(36).substring(7).toUpperCase();

        // Store application
        const application = {
            id: applicationId,
            userId: userId,
            username: username,
            fullname: fullname,
            idNumber: idNumber,
            profilePictureUrl: profilePicture.url,
            createdAt: new Date(),
            status: 'pending'
        };

        pendingApplications.set(applicationId, application);
        userApplications.set(userId, applicationId);

        // Send application to approval channel with buttons
        const approvalChannel = await client.channels.fetch(applicationChannel);
        const applicationMessage = `\`\`\`ansi
\u001b[33m[NEW_APPLICATION] >> VERIFICATION REQUEST
\u001b[33m[USERNAME] :: ${username}
\u001b[33m[DISCORD_ID] :: ${userId}
\u001b[33m[FULL_NAME] :: ${fullname}
\u001b[33m[ID_NUMBER] :: ${idNumber}
\u001b[33m[APP_ID] :: ${applicationId}
\u001b[33m[TIMESTAMP] :: ${new Date().toLocaleString()}
\u001b[33m[WARNING] >> Verify all info before approval
\`\`\``;

        // Create approval buttons
        const approvalButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_${applicationId}`)
                    .setLabel('✅ APPROVE')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deny_${applicationId}`)
                    .setLabel('❌ DENY')
                    .setStyle(ButtonStyle.Danger)
            );

        // Resize profile picture to 150x150
        const resizedProfileBuffer = await resizeImageTo150x150(profilePicture.url);
        
        const messageData = {
            content: applicationMessage,
            components: [approvalButtons]
        };

        // Add image file
        if (resizedProfileBuffer) {
            messageData.files = [{
                attachment: resizedProfileBuffer,
                name: `profile_${applicationId}_150x150.jpg`,
                description: `Resized profile picture for ${fullname}`
            }];
        } else {
            messageData.files = [profilePicture.url];
        }

        const sentMessage = await approvalChannel.send(messageData);

        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[32m[APPLICATION_SUBMITTED] >> Verification request sent
\u001b[32m[APP_ID] >> ${applicationId}
\u001b[32m[STATUS] >> Pending admin review
\u001b[32m[WARNING] >> False info = permanent ban
\u001b[32m[WAIT] >> Check back later for approval status
\`\`\``, 
            flags: 64 
        });

        // Log application
        try {
            const logChannel = await client.channels.fetch(modChannel);
            await logChannel.send(`**📋 NEW APPLICATION SUBMITTED**\nUser: ${username} (${userId})\nFull Name: ${fullname}\nID Number: ${idNumber}\nApplication ID: ${applicationId}\nTimestamp: ${new Date().toLocaleString()}`);
        } catch (error) {
            console.error('❌ Error logging application:', error.message);
        }

    } catch (error) {
        console.error('❌ Error handling apply command:', error.message);
        console.error('Error details:', error);
        
        if (!interaction.replied) {
            await interaction.reply({ content: "❌ Could not submit application. Please try again.", flags: 64 });
        } else {
            await interaction.followUp({ content: "❌ Could not submit application. Please try again.", flags: 64 });
        }
    }
}

// Handle button interactions
async function handleButtonInteraction(interaction) {
    try {
        console.log(`🔘 Button interaction received: ${interaction.customId} from ${interaction.user.username}`);
        
        // Acknowledge the interaction immediately to prevent timeout
        await interaction.deferUpdate();
        
        const customId = interaction.customId;
        const adminUsername = interaction.user.username || "Unknown Admin";

        // Check if user has admin permissions
        if (!hasAdminPermissions(interaction)) {
            await interaction.followUp({ content: "❌ You don't have permission to approve applications.", flags: 64 });
            return;
        }

        if (customId.startsWith('approve_') || customId.startsWith('deny_')) {
            const action = customId.startsWith('approve_') ? 'approve' : 'deny';
            const applicationId = customId.split('_')[1];

            const application = pendingApplications.get(applicationId);
            if (!application) {
                await interaction.followUp({ content: "❌ Application not found or already processed.", flags: 64 });
                return;
            }

            try {
                if (action === 'approve') {
                // Approve user
                approvedUsers.add(application.userId);
                application.status = 'approved';
                application.reviewedBy = interaction.user.id;
                application.reviewedAt = new Date();

                // Remove from pending
                pendingApplications.delete(applicationId);

                // Notify user (if possible)
                try {
                    const user = await client.users.fetch(application.userId);
                    await user.send(`\`\`\`ansi
\u001b[32m[APPROVED] >> Your application has been approved
\u001b[32m[STATUS] >> Full marketplace access granted
\u001b[32m[PERMISSIONS] >> Can now sell and bid
\u001b[32m[COMMANDS] >> /sell and /bid now available
\u001b[32m[WARNING] >> Follow all marketplace rules
\`\`\``);
                } catch (error) {
                    console.log('Could not DM user about approval');
                }

                // Update the message with approval status
                const updatedMessage = `\`\`\`ansi
\u001b[32m[APPROVED] >> APPLICATION VERIFIED ✅
\u001b[32m[USERNAME] :: ${application.username}
\u001b[32m[DISCORD_ID] :: ${application.userId}
\u001b[32m[FULL_NAME] :: ${application.fullname}
\u001b[32m[ID_NUMBER] :: ${application.idNumber}
\u001b[32m[APP_ID] :: ${applicationId}
\u001b[32m[APPROVED_BY] :: ${adminUsername}
\u001b[32m[TIMESTAMP] :: ${new Date().toLocaleString()}
\u001b[32m[STATUS] >> FULL MARKETPLACE ACCESS GRANTED
\`\`\``;

                await interaction.editReply({ 
                    content: updatedMessage, 
                    components: [] // Remove buttons
                });

                } else {
                    // Deny user
                application.status = 'denied';
                application.reviewedBy = interaction.user.id;
                application.reviewedAt = new Date();

                // Remove from pending
                pendingApplications.delete(applicationId);
                userApplications.delete(application.userId);

                // Notify user (if possible)
                try {
                    const user = await client.users.fetch(application.userId);
                    await user.send(`\`\`\`ansi
\u001b[31m[DENIED] >> Your application has been denied
\u001b[31m[REASON] >> Information verification failed
\u001b[31m[STATUS] >> No marketplace access
\u001b[31m[ACTION] >> Resubmit with valid information
\`\`\``);
                } catch (error) {
                    console.log('Could not DM user about denial');
                }

                // Update the message with denial status
                const updatedMessage = `\`\`\`ansi
\u001b[31m[DENIED] >> APPLICATION REJECTED ❌
\u001b[31m[USERNAME] :: ${application.username}
\u001b[31m[DISCORD_ID] :: ${application.userId}
\u001b[31m[FULL_NAME] :: ${application.fullname}
\u001b[31m[ID_NUMBER] :: ${application.idNumber}
\u001b[31m[APP_ID] :: ${applicationId}
\u001b[31m[DENIED_BY] :: ${adminUsername}
\u001b[31m[TIMESTAMP] :: ${new Date().toLocaleString()}
\u001b[31m[REASON] >> Information verification failed
\`\`\``;

                await interaction.editReply({ 
                    content: updatedMessage, 
                    components: [] // Remove buttons
                });
                }

                // Log admin action
                try {
                    const logChannel = await client.channels.fetch(modChannel);
                    await logChannel.send(`**⚖️ APPLICATION ${action.toUpperCase()}**\nAdmin: ${adminUsername} (${interaction.user.id})\nUser: ${application.username} (${application.userId})\nApplication ID: ${applicationId}\nAction: ${action}\nTimestamp: ${new Date().toLocaleString()}`);
                } catch (error) {
                    console.error('❌ Error logging admin action:', error.message);
                }

            } catch (error) {
                console.error('❌ Error handling button interaction:', error.message);
                console.error('Error details:', error);
                try {
                    await interaction.followUp({ content: "❌ Could not process application. Please try again.", flags: 64 });
                } catch (followUpError) {
                    console.error('❌ Could not send follow-up message:', followUpError.message);
                }
            }
        }
    } catch (mainError) {
        console.error('❌ Error in button interaction handler:', mainError.message);
        console.error('Main error details:', mainError);
    }
}

// Handle /auctions command
async function handleAuctionsCommand(interaction) {
    if (activeAuctions.size === 0) {
        await interaction.reply({ 
            content: `\`\`\`ansi
\u001b[33m[MARKETPLACE] >> No active auctions
\u001b[33m[STATUS] >> Market currently empty
\u001b[33m[INFO] >> Use /sell to list items
\`\`\``, 
            flags: 64 
        });
        return;
    }

    let auctionsList = `\`\`\`ansi
\u001b[32m[ACTIVE_AUCTIONS] >> MARKETPLACE STATUS
\u001b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    for (const [auctionId, auction] of activeAuctions) {
        if (auction.isActive) {
            const timeLeft = Math.floor((auction.endTime - new Date()) / (1000 * 60 * 60));
            auctionsList += `\u001b[32m[${auctionId}] ${auction.item} - $${auction.currentPrice} (${timeLeft}h left)\n`;
        }
    }

    auctionsList += `\u001b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\u001b[32m[CMD] >> /bid <auction_id> <amount> to bid
\`\`\``;

    await interaction.reply({ content: auctionsList, flags: 64 });
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Start Express server for health checks
app.get('/', (req, res) => {
    res.json({ 
        name: 'Discord Anonymous Bot',
        status: 'running',
        uptime: process.uptime(),
        description: 'Discord bot with anonymous messaging and community features',
        endpoints: {
            health: '/health',
            root: '/'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(8000, '0.0.0.0', () => {
    console.log('🌐 Health check server running on port 8000');
});

// Login to Discord
if (token) {
    client.login(token).catch(error => {
        console.error('❌ Error logging in to Discord:', error);
        console.log('💡 Please check your DISCORD_BOT_TOKEN is valid');
        console.log('🔗 Get your token from: https://discord.com/developers/applications');
    });
} else {
    console.log('🤖 Bot ready to connect - please provide DISCORD_BOT_TOKEN');
    console.log('🔗 Get your token from: https://discord.com/developers/applications');
}