const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

/**
 * Parses user-friendly duration strings (e.g., "5m", "2h", "1d") into milliseconds.
 */
function parseDuration(str) {
  const match = str.match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily time out (mute) a member in the server.')
    .addUserOption(option =>
      option.setName('member')
        .setDescription('The member to time out')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration of timeout (e.g., 5m, 1h, 1d, 7d — max 28d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('member');
    const durationInput = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason specified';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ Target member was not found in this server.', ephemeral: true });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot time out yourself.', ephemeral: true });
    }

    if (member.id === client.user.id) {
      return interaction.reply({ content: '❌ I cannot time out myself.', ephemeral: true });
    }

    // Role hierarchy checks
    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: '⚠️ You cannot time out this member because their role is equal to or higher than yours.',
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content: '⚠️ I cannot time out this member. Ensure my bot role is positioned higher than the member\'s highest role.',
        ephemeral: true
      });
    }

    const durationMs = parseDuration(durationInput);
    const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000; // 28 days Discord API limit

    if (!durationMs || durationMs <= 0 || durationMs > maxTimeoutMs) {
      return interaction.reply({
        content: '❌ Invalid duration format! Use formats like `5m`, `30m`, `2h`, `1d` (maximum: 28 days).',
        ephemeral: true
      });
    }

    try {
      await member.timeout(durationMs, `${interaction.user.tag}: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('🔇 Member Timed Out')
        .setDescription(`Successfully timed out ${member} for **${durationInput}**.`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Mod log
      const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[TimeoutCommand] Error executing timeout:', err);
      return interaction.reply({
        content: `❌ Failed to timeout member: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
