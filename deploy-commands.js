require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
  console.error('[Deploy] Commands directory does not exist.');
  process.exit(1);
}

const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    try {
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`[Deploy] Prepared slash command: /${command.data.name} (${folder})`);
      } else {
        console.warn(`[Deploy] Skipped ${file}: Missing "data" or "execute".`);
      }
    } catch (err) {
      console.error(`[Deploy] Error reading ${file}:`, err);
    }
  }
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || token === 'your_discord_bot_token_here') {
  console.error('[Deploy] Error: DISCORD_TOKEN is not configured in .env');
  process.exit(1);
}

if (!clientId || clientId === 'your_discord_application_client_id_here') {
  console.error('[Deploy] Error: CLIENT_ID is not configured in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`[Deploy] Started refreshing ${commands.length} application (/) commands.`);

    if (guildId && guildId.trim().length > 0) {
      // Deploy to specific test guild (Instant updates, great for development)
      console.log(`[Deploy] Deploying commands to Guild: ${guildId}`);
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`[Deploy] Successfully registered ${data.length} guild slash commands!`);
    } else {
      // Deploy globally (Can take up to an hour for Discord caches to update globally)
      console.log('[Deploy] Deploying commands Globally (All servers)...');
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`[Deploy] Successfully registered ${data.length} global slash commands!`);
    }
  } catch (error) {
    console.error('[Deploy] Failed to register slash commands:', error);
  }
})();
