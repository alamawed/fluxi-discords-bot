const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server with optional message history deletion.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('delete_days')
        .setDescription('Number of days of message history to delete (0 to 7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason specified';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;
    const deleteMessageSeconds = deleteDays * 24 * 60 * 60;

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
    }

    if (targetUser.id === client.user.id) {
      return interaction.reply({ content: '❌ I cannot ban myself.', ephemeral: true });
    }

    // Try to fetch member in case they are in the guild for hierarchy check
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '⚠️ You cannot ban this member because their role is equal to or higher than yours.',
          ephemeral: true
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          content: '⚠️ I cannot ban this member. Check my role hierarchy and permissions.',
          ephemeral: true
        });
      }
    }

    try {
      await interaction.guild.members.ban(targetUser.id, {
        reason: `${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🔨 Member Banned')
        .setDescription(`Successfully banned **${targetUser.tag}** (\`${targetUser.id}\`).`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Messages Purged', value: `${deleteDays} day(s)`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[BanCommand] Error banning user:', err);
      return interaction.reply({
        content: `❌ Failed to ban user: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
