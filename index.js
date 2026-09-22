require('dotenv').config();

// --- PATH OVERRIDE FIX FOR FLAT STRUCTURE ---
const Module = require('module');
const path = require('path');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(request) {
  if (request.includes('config.json')) {
    return originalRequire.call(this, path.join(__dirname, 'config.json'));
  }
  if (request.includes('services/database') || request.includes('database.js')) {
    return originalRequire.call(this, path.join(__dirname, 'database.js'));
  }
  return originalRequire.call(this, request);
};
// -------------------------------------------

const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Collection 
} = require('discord.js');
const { Player } = require('discord-player');

const loadCommands = require('./commandHandler');
const loadEvents = require('./eventHandler');
const setupPlayerEvents = require('./playerHandler');

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

  player.extractors.loadDefault().then(() => {
    console.log('[MusicPlayer] Default audio extractors loaded successfully.');
  }).catch(err => {
    console.warn('[MusicPlayer] Note: Default extractors loading notice:', err.message);
  });

  setupPlayerEvents(player);
} catch (err) {
  console.error('[MusicPlayer] Failed to initialize discord-player:', err.message);
}

// 4. Attach command and event handlers
loadCommands(client);
loadEvents(client);

// 5. Global Unhandled Rejection & Uncaught Exception Guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Process Guard] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`💥 [Process Guard] Uncaught Exception (${origin}):`, err);
});

// 6. Connect to Discord Gateway
const token = process.env.DISCORD_TOKEN;

if (!token || token === 'your_discord_bot_token_here') {
  console.error('❌ [Startup Error] DISCORD_TOKEN is missing or not set in .env / Railway Variables!');
  process.exit(1);
}

client.login(token).catch(err => {
  console.error('❌ [Login Error] Failed to connect to Discord Gateway:', err.message);
});