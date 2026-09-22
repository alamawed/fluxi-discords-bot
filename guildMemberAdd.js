const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    try {
      const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
      const targetChannel = logChannelId 
        ? member.guild.channels.cache.get(logChannelId)
        : member.guild.systemChannel;

      if (!targetChannel || !targetChannel.isTextBased()) return;

      const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setAuthor({ name: 'Member Joined', iconURL: member.user.displayAvatarURL() })
        .setDescription(`Welcome ${member} to **${member.guild.name}**!`)
        .addFields(
          { name: 'User Tag', value: `\`${member.user.tag}\``, inline: true },
          { name: 'User ID', value: `\`${member.id}\``, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${accountAgeDays} days ago)`, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `Member #${member.guild.memberCount}` })
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[GuildMemberAdd] Error logging new member:', err.message);
    }
  }
};
