const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption(option =>
      option.setName('member')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No reason specified';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ Target member was not found in this server.', ephemeral: true });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });
    }

    if (member.id === client.user.id) {
      return interaction.reply({ content: '❌ I cannot kick myself.', ephemeral: true });
    }

    // Role hierarchy checks
    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: '⚠️ You cannot kick this member because their role is equal to or higher than yours.',
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        content: '⚠️ I cannot kick this member. Check my role hierarchy and permissions.',
        ephemeral: true
      });
    }

    try {
      await member.kick(`${interaction.user.tag}: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('👢 Member Kicked')
        .setDescription(`Successfully kicked **${targetUser.tag}** (\`${targetUser.id}\`).`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
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
      console.error('[KickCommand] Error kicking member:', err);
      return interaction.reply({
        content: `❌ Failed to kick member: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
