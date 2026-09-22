const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music playback, clear the server queue, and disconnect the bot.'),

  async execute(interaction, client) {
    const queue = useQueue(interaction.guild.id);

    if (!queue) {
      return interaction.reply({
        content: '⚠️ No active music playback found in this server.',
        ephemeral: true
      });
    }

    queue.delete();

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🛑 Music Stopped')
      .setDescription('The queue has been cleared and the bot has disconnected from the voice channel.')
      .setFooter({ text: `Requested by ${interaction.user.tag}` });

    return interaction.reply({ embeds: [embed] });
  }
};
