const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the list of tracks currently queued in this server.')
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page number to display')
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const queue = useQueue(interaction.guild.id);

    if (!queue || !queue.tracks.size && !queue.currentTrack) {
      return interaction.reply({
        content: '📭 The music queue is currently empty.',
        ephemeral: true
      });
    }

    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.toArray();
    const tracksPerPage = 10;
    const totalPages = Math.ceil(tracks.length / tracksPerPage) || 1;
    const page = Math.min(interaction.options.getInteger('page') || 1, totalPages);

    const startIndex = (page - 1) * tracksPerPage;
    const selectedTracks = tracks.slice(startIndex, startIndex + tracksPerPage);

    const trackListFormatted = selectedTracks.map((track, i) => {
      return `\`${startIndex + i + 1}.\` [${track.title}](${track.url}) — \`${track.duration}\` (by ${track.requestedBy?.tag || 'Member'})`;
    }).join('\n') || '*No upcoming tracks queued.*';

    const embed = new EmbedBuilder()
      .setColor(config.colors.music || '#9B59B6')
      .setTitle(`🎶 Server Music Queue (${tracks.length} upcoming)`)
      .setDescription(
        `**Now Playing:**\n▶️ [${currentTrack.title}](${currentTrack.url}) — \`${currentTrack.duration}\`\n\n` +
        `**Upcoming Songs:**\n${trackListFormatted}`
      )
      .setFooter({ text: `Page ${page} of ${totalPages} • Total tracks: ${tracks.length + 1}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
