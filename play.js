const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist from YouTube, Spotify, SoundCloud, or search keywords.')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song title, artist name, or URL')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const player = useMainPlayer();
    if (!player) {
      return interaction.reply({
        content: '⚠️ Audio player is not initialized.',
        ephemeral: true
      });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ **Voice Channel Required:** You must join a voice channel before playing audio!',
        ephemeral: true
      });
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return interaction.reply({
        content: '⚠️ **Permission Error:** I need permission to **Connect** and **Speak** in your voice channel.',
        ephemeral: true
      });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const searchResult = await player.search(query, {
        requestedBy: interaction.user
      });

      if (!searchResult || !searchResult.tracks.length) {
        return interaction.editReply({
          content: `🔍 No audio results found for: \`${query}\``
        });
      }

      const { track } = await player.play(voiceChannel, searchResult, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            requestedBy: interaction.user
          },
          volume: 75,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 120000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 120000
        }
      });

      const playEmbed = new EmbedBuilder()
        .setColor(config.colors.music || '#9B59B6')
        .setTitle('🎶 Queued Audio')
        .setDescription(`[${track.title}](${track.url})`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: 'Duration', value: `\`${track.duration}\``, inline: true },
          { name: 'Author', value: `\`${track.author || 'Unknown'}\``, inline: true },
          { name: 'Channel', value: `${voiceChannel.name}`, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [playEmbed] });
    } catch (error) {
      console.error('[PlayCommand] Error playing track:', error);
      return interaction.editReply({
        content: `⚠️ Failed to play audio: ${error.message || 'Stream extraction error'}`
      });
    }
  }
};
