const { Events, ActivityType } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`====================================================`);
    console.log(`🚀 [Ready] Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`🌐 [Ready] Serving ${client.guilds.cache.size} server(s) and ${client.users.cache.size} cached users`);
    console.log(`====================================================`);

    // Set dynamic custom bot activity
    client.user.setPresence({
      activities: [
        {
          name: config.bot.activity || 'Communities | /help',
          type: ActivityType.Custom,
          state: '⚡ All-in-one Bot • /help for commands'
        }
      ],
      status: 'online'
    });
  }
};
