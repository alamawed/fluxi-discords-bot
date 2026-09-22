const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete up to 100 messages from the current channel.')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1 - 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction, client) {
    const amount = interaction.options.getInteger('amount');

    // Bot permission check
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '⚠️ I do not have the **Manage Messages** permission to delete messages.',
        ephemeral: true
      });
    }

    try {
      // Bulk delete (filterOld: true ignores messages older than 14 days)
      const deleted = await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🧹 Channel Purged')
        .setDescription(`Successfully purged **${deleted.size}** message(s).`)
        .setFooter({ text: deleted.size < amount ? 'Note: Messages older than 14 days cannot be bulk deleted.' : 'Channel cleaned.' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      // Optional mod log notification
      const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          const modEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('🛡️ Moderation: Bulk Message Purge')
            .addFields(
              { name: 'Moderator', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
              { name: 'Channel', value: `${interaction.channel}`, inline: true },
              { name: 'Count Deleted', value: `${deleted.size}`, inline: true }
            )
            .setTimestamp();

          logChannel.send({ embeds: [modEmbed] }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[PurgeCommand] Error deleting messages:', err);
      return interaction.reply({
        content: `❌ Failed to delete messages: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
