const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../services/database');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your free daily coins once every 24 hours!'),

  async execute(interaction, client) {
    const minReward = config.economy.dailyRewardMin || 100;
    const maxReward = config.economy.dailyRewardMax || 250;
    const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

    const result = db.claimDaily(interaction.user.id, interaction.guild.id, reward);

    if (!result.success && result.cooldown) {
      const availableTimestamp = Math.floor(Date.now() / 1000) + result.remainingSeconds;
      return interaction.reply({
        content: `⏳ **Cooldown Active:** You have already claimed your daily reward! You can claim again <t:${availableTimestamp}:R>.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setAuthor({
        name: 'Daily Reward Claimed!',
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(`🎉 You received **+${result.reward}** ${config.economy.currencySymbol} ${config.economy.currencyName}!`)
      .addFields(
        { name: 'Updated Balance', value: `**${result.balance}** ${config.economy.currencySymbol}`, inline: true },
        { name: 'Next Claim', value: 'Available in 24 hours', inline: true }
      )
      .setFooter({ text: 'Come back tomorrow to keep building your server wealth!' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
