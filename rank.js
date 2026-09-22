const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../services/database');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or another member\'s leveling rank, XP progress, and balance.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user whose rank profile you want to inspect')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('target') || interaction.user;

    if (targetUser.bot) {
      return interaction.reply({
        content: '🤖 Bots do not participate in leveling or the server economy!',
        ephemeral: true
      });
    }

    const userData = db.getUser(targetUser.id, interaction.guild.id);
    const xpNeeded = db.getXpForNextLevel(userData.level);
    const serverRank = db.getUserRank(targetUser.id, interaction.guild.id);

    // Generate graphical ASCII progress bar
    const totalBars = 12;
    const progressRatio = Math.min(Math.max(userData.xp / xpNeeded, 0), 1);
    const filledBars = Math.round(progressRatio * totalBars);
    const emptyBars = totalBars - filledBars;
    const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);
    const progressPercent = Math.round(progressRatio * 100);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({
        name: `${targetUser.username}'s Server Profile`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '🏆 Server Rank', value: `#**${serverRank}**`, inline: true },
        { name: '⭐ Level', value: `**${userData.level}**`, inline: true },
        { name: `${config.economy.currencySymbol} Balance`, value: `**${userData.balance}** ${config.economy.currencyName}`, inline: true },
        {
          name: `📈 Experience Progress (${progressPercent}%)`,
          value: `\`${progressBar}\`\n**${userData.xp}** / **${xpNeeded}** XP to Level ${userData.level + 1}`
        }
      )
      .setFooter({ text: config.bot.footerText })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
