const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display information and available commands for the bot.'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('⚡ Multi-Purpose Bot Command Reference')
      .setDescription('Here is an overview of the core modules and slash commands available:')
      .addFields(
        {
          name: '🎨 Custom Content & Media Sharing',
          value: '• `/post <title> <attachment/link> [category] [description]` — Showcase creative work, clips, code, or links in a stylized card.'
        },
        {
          name: '🎶 Music & Voice Streaming',
          value: '• `/play <query>` — Stream audio or playlists from YouTube/Spotify\n• `/skip` — Skip the current track\n• `/queue` — View server playback queue\n• `/stop` — Clear queue and leave voice'
        },
        {
          name: '🤖 Google Gemini AI Core',
          value: '• `/ai <prompt> [style]` — Query Gemini 2.5 Flash\n• Direct Mention: `@Bot <question>` — Chat directly in any channel'
        },
        {
          name: '🪙 Leveling & Economy',
          value: '• `/rank [user]` — Inspect level, XP progress bar, and balance\n• `/leaderboard [category]` — Server top XP or wealth ranking\n• `/daily` — Claim free coins every 24 hours'
        },
        {
          name: '🛡️ Moderation Suite',
          value: '• `/purge <amount>` — Bulk delete 1-100 messages\n• `/timeout <user> <duration> [reason]` — Time out a member\n• `/kick <user> [reason]` — Kick a member\n• `/ban <user> [reason] [delete_days]` — Ban a user'
        }
      )
      .setFooter({ text: config.bot.footerText })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
