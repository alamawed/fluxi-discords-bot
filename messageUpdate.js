const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    // Ignore bots, DMs, or edits where content didn't change (e.g. embed loads)
    if (!newMessage.guild || (newMessage.author && newMessage.author.bot)) return;
    if (oldMessage.content === newMessage.content) return;

    const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
    if (!logChannelId) return;

    const logChannel = newMessage.guild.channels.cache.get(logChannelId);
    if (!logChannel || !logChannel.isTextBased()) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('✏️ Message Edited')
        .addFields(
          {
            name: 'Author',
            value: newMessage.author ? `${newMessage.author.tag} (\`${newMessage.author.id}\`)` : 'Unknown User',
            inline: true
          },
          {
            name: 'Channel',
            value: `${newMessage.channel} (\`#${newMessage.channel.name}\`)`,
            inline: true
          },
          {
            name: 'Jump to Message',
            value: `[Click Here](${newMessage.url})`,
            inline: true
          },
          {
            name: 'Before',
            value: oldMessage.content && oldMessage.content.length > 0 
              ? (oldMessage.content.length > 950 ? oldMessage.content.slice(0, 950) + '...' : oldMessage.content)
              : '*Original content unavailable (uncached)*'
          },
          {
            name: 'After',
            value: newMessage.content && newMessage.content.length > 0 
              ? (newMessage.content.length > 950 ? newMessage.content.slice(0, 950) + '...' : newMessage.content)
              : '*Empty*'
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[MessageUpdate] Error sending edit audit log:', err.message);
    }
  }
};
