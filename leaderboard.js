const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../services/database');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display the top members in the server by XP or economy balance.')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Leaderboard category to display')
        .setRequired(false)
        .addChoices(
          { name: '⭐ Level & Experience (XP)', value: 'xp' },
          { name: '🪙 Economy Balance', value: 'balance' }
        )
    ),

  async execute(interaction, client) {
    const category = interaction.options.getString('category') || 'xp';
    const topUsers = db.getLeaderboard(interaction.guild.id, category, 10);

    if (!topUsers.length) {
      return interaction.reply({
        content: '📊 No server activity recorded yet for the leaderboard!',
        ephemeral: true
      });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = await Promise.all(topUsers.map(async (u, idx) => {
      const positionBadge = idx < 3 ? medals[idx] : `\`#${idx + 1}\``;
      let memberDisplay = `<@${u.user_id}>`;

      if (category === 'xp') {
        return `${positionBadge} ${memberDisplay} — **Lvl ${u.level}** (\`${u.xp} XP\`)`;
      } else {
        return `${positionBadge} ${memberDisplay} — **${u.balance}** ${config.economy.currencySymbol}`;
      }
    }));

    const title = category === 'xp' 
      ? '🏆 Server Experience Leaderboard (Top 10)' 
      : `🪙 Server Wealth Leaderboard (Top 10)`;

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(title)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `${config.bot.footerText} • Chat and participate to climb the ranks!` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
