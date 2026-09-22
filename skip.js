const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing track.'),

  async execute(interaction, client) {
    const queue = useQueue(interaction.guild.id);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        content: '⚠️ No music is currently playing in this server.',
        ephemeral: true
      });
    }

    const currentTrack = queue.currentTrack;
    const success = queue.node.skip();

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('⏭️ Track Skipped')
      .setDescription(success && currentTrack ? `Skipped: **${currentTrack.title}**` : 'Skipped current track.')
      .setFooter({ text: `Skipped by ${interaction.user.tag}` });

    return interaction.reply({ embeds: [embed] });
  }
};
