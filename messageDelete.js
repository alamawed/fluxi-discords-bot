const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    // Ignore bot messages, partials without author, or DMs
    if (!message.guild || (message.author && message.author.bot)) return;

    const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
    if (!logChannelId) return;

    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel || !logChannel.isTextBased()) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🗑️ Message Deleted')
        .addFields(
          {
            name: 'Author',
            value: message.author ? `${message.author.tag} (\`${message.author.id}\`)` : 'Unknown User',
            inline: true
          },
          {
            name: 'Channel',
            value: `${message.channel} (\`#${message.channel.name}\`)`,
            inline: true
          },
          {
            name: 'Content',
            value: message.content && message.content.length > 0 
              ? (message.content.length > 1000 ? message.content.slice(0, 1000) + '...' : message.content)
              : '*No text content (may have been an embed or system message)*'
          }
        )
        .setTimestamp();

      if (message.attachments.size > 0) {
        const attachmentUrls = message.attachments.map(att => att.url).join('\n');
        embed.addFields({
          name: `Attachments (${message.attachments.size})`,
          value: attachmentUrls.slice(0, 1000)
        });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[MessageDelete] Error sending audit log:', err.message);
    }
  }
};
