const { EmbedBuilder } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const config = require('./config.json');

/**
 * Registers listeners and load extractors for the discord-player instance.
 * @param {import('discord-player').Player} player 
 */
function setupPlayerEvents(player) {
  if (!player || !player.events) {
    console.warn('[PlayerHandler] Discord Player is not available or initialized.');
    return;
  }

  // Load stream extractors with YouTubei fallback to fix "Not Found" errors
  async function initializeExtractors() {
    try {
      // Register the stable YoutubeiExtractor first
      await player.extractors.register(YoutubeiExtractor, {});
      // Load remaining default extractors
      await player.extractors.loadMulti(DefaultExtractors);
      console.log('[PlayerHandler] Audio extractors (including Youtubei) loaded successfully.');
    } catch (err) {
      console.error('[PlayerHandler] Failed to load extractors:', err.message);
    }
  }

  initializeExtractors();

  // Emitted when a track starts playing
  player.events.on('playerStart', (queue, track) => {
    const embed = new EmbedBuilder()
      .setColor(config.colors.music || '#9B59B6')
      .setAuthor({ name: 'Now Playing 🎵', iconURL: queue.guild.iconURL() || undefined })
      .setTitle(track.title)
      .setURL(track.url)
      .setThumbnail(track.thumbnail)
      .addFields(
        { name: 'Duration', value: `⏱️ \`${track.duration}\``, inline: true },
        { name: 'Artist / Channel', value: `🎤 \`${track.author || 'Unknown'}\``, inline: true },
        { name: 'Requested By', value: `${track.requestedBy || 'Unknown Member'}`, inline: true }
      )
      .setFooter({ text: `${config.bot?.footerText || 'FLUXi Bot'} • Queue length: ${queue.tracks.size} track(s)` })
      .setTimestamp();

    queue.metadata?.channel?.send({ embeds: [embed] }).catch(err => {
      console.error('[PlayerHandler] Failed to send playerStart embed:', err.message);
    });
  });

  // Emitted when a single track is added to the queue
  player.events.on('audioTrackAdd', (queue, track) => {
    const embed = new EmbedBuilder()
      .setColor(config.colors.info || '#3498DB')
      .setTitle('Added to Queue 🎶')
      .setDescription(`[${track.title}](${track.url})`)
      .setThumbnail(track.thumbnail)
      .addFields(
        { name: 'Position', value: `#${queue.tracks.size}`, inline: true },
        { name: 'Duration', value: `\`${track.duration}\``, inline: true },
        { name: 'Requested By', value: `${track.requestedBy || 'Member'}`, inline: true }
      )
      .setTimestamp();

    queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => {});
  });

  // Emitted when queue finishes
  player.events.on('emptyQueue', (queue) => {
    const embed = new EmbedBuilder()
      .setColor(config.colors.warning || '#F1C40F')
      .setDescription('🏁 **Queue finished.** No more tracks left to play.')
      .setTimestamp();

    queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => {});
  });

  // Emitted when track error occurs during streaming
  player.events.on('playerError', (queue, error, track) => {
    console.error(`[PlayerHandler] Track Error on "${track?.title}":`, error.message);
    const embed = new EmbedBuilder()
      .setColor(config.colors.error || '#E74C3C')
      .setTitle('Audio Playback Error')
      .setDescription(`⚠️ An error occurred while streaming **${track?.title || 'current track'}**:\n\`${error.message}\``)
      .setTimestamp();

    queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => {});
  });

  player.events.on('error', (queue, error) => {
    console.error(`[PlayerHandler] General Player Error in guild ${queue.guild.id}:`, error.message);
  });

  console.log('[PlayerHandler] Discord Player event listeners configured successfully.');
}

module.exports = setupPlayerEvents;