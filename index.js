require('dotenv').config();

// --- PATH OVERRIDE FIX FOR FLAT STRUCTURE ---
const Module = require('module');
const path = require('path');
const fs = require('fs');
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
  Collection,
  REST,
  Routes 
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

// 2. Collections for Slash Commands and Cooldowns
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

// 5. Automatic Slash Command Deployment on Startup
async function deployCommands() {
  const commands = [];
  const rootPath = __dirname;
  const skipFiles = [
    'index.js', 'commandHandler.js', 'eventHandler.js', 'playerHandler.js', 
    'deploy-commands.js', 'database.js', 'gemini.js', 'ai.js', 'config.json'
  ];

  const commandFiles = fs.readdirSync(rootPath).filter(file => file.endsWith('.js') && !skipFiles.includes(file));

  for (const file of commandFiles) {
    try {
      const filePath = path.join(rootPath, file);
      const command = require(filePath);
      if (command && 'data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      }
    } catch (err) {
      // Skip non-command files
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(`[Deployer] Started refreshing ${commands.length} application (/) commands.`);

    // If you want instant deployment to a specific test server, set GUILD_ID in Railway. Otherwise, it deploys globally.
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`[Deployer] Successfully reloaded commands for guild: ${process.env.GUILD_ID}`);
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log('[Deployer] Successfully reloaded global application commands.');
    }
  } catch (error) {
    console.error('[Deployer] Error deploying commands:', error);
  }
}

// 6. Global Unhandled Guards
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Process Guard] Unhandled Promise Rejection:', reason);
});

// 7. Connect to Discord Gateway
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ [Startup Error] DISCORD_TOKEN is missing or not set in Railway Variables!');
  process.exit(1);
}

client.login(token).then(async () => {
  console.log(`✅ Logged in successfully as ${client.user.tag}!`);
  // Automatically deploy commands upon successful login if CLIENT_ID is provided
  if (process.env.CLIENT_ID) {
    await deployCommands();
  } else {
    console.warn('⚠️ [Deployer] CLIENT_ID variable is missing in Railway. Skipping automatic command registration.');
  }
}).catch(err => {
  console.error('❌ [Login Error] Failed to connect to Discord Gateway:', err.message);
});