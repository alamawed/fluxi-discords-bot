require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Collection 
} = require('discord.js');
const { Player } = require('discord-player');

const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { setupPlayerEvents } = require('./handlers/playerHandler');

// 1. Initialize Discord Client with production-grade intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

// 2. Collections for Slash Commands and Rate-limiting Cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// 3. Initialize Audio Player for Music Streaming
let player = null;
try {
  player = new Player(client, {
    ytdlOptions: {
      quality: 'highestaudio',
      highWaterMark: 1 << 25
    }
  });

  // Load default stream extractors (YouTube, Spotify, SoundCloud, Apple Music)
  player.extractors.loadDefault().then(() => {
    console.log('[MusicPlayer] Default audio extractors loaded successfully.');
  }).catch(err => {
    console.warn('[MusicPlayer] Note: Default extractors loading notice:', err.message);
  });

  // Attach player event listeners
  setupPlayerEvents(player);
} catch (err) {
  console.error('[MusicPlayer] Failed to initialize discord-player:', err.message);
}

// 4. Attach command and event handlers
loadCommands(client);
loadEvents(client);

// 5. Global Unhandled Rejection & Uncaught Exception Guards
// Ensures that unexpected network failures or unhandled promises never crash the bot
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Process Guard] Unhandled Promise Rejection:');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`💥 [Process Guard] Uncaught Exception (${origin}):`, err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error(`🔍 [Process Guard Monitor] Exception logged (${origin}):`, err.message);
});

// 6. Connect to Discord Gateway
const token = process.env.DISCORD_TOKEN;

if (!token || token === 'your_discord_bot_token_here') {
  console.error('❌ [Startup Error] DISCORD_TOKEN is missing or not set in .env!');
  console.log('👉 Please edit the .env file with your bot token and restart.');
  process.exit(1);
}

client.login(token).catch(err => {
  console.error('❌ [Login Error] Failed to connect to Discord Gateway:', err.message);
  console.log('👉 Check your DISCORD_TOKEN and ensure all required Privileged Gateway Intents are enabled in the Discord Developer Portal.');
});
