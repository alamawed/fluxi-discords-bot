const { Events, EmbedBuilder } = require('discord.js');
const db = require('../services/database');
const gemini = require('../services/gemini');
const config = require('../config.json');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Ignore all bots or messages not sent in guilds
    if (message.author.bot || !message.guild) return;

    // 1. Process Leveling / XP System
    try {
      const minXp = config.leveling.minXpPerMessage || 15;
      const maxXp = config.leveling.maxXpPerMessage || 25;
      const randomXp = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
      const cooldown = config.leveling.xpCooldownSeconds || 60;

      const xpResult = db.addXp(message.author.id, message.guild.id, randomXp, cooldown);

      if (xpResult.leveledUp) {
        const levelEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🎉 Level Up!')
          .setDescription(`Congratulations ${message.author}! You advanced from **Level ${xpResult.oldLevel}** to **Level ${xpResult.newLevel}**!`)
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'Keep chatting to earn more XP and climb the ranks!' });

        message.channel.send({ embeds: [levelEmbed] }).catch(() => {});
      }
    } catch (err) {
      console.error('[MessageCreate] Error in leveling system:', err);
    }

    // 2. Bot Mention AI Trigger
    // Triggers when a user directly tags the bot: @BotName <question>
    const isDirectMention = message.mentions.has(client.user) && !message.mentions.everyone;

    if (isDirectMention) {
      // Strip bot mention tag from prompt
      const botMentionRegex = new RegExp(`^<@!?${client.user.id}>\\s*`);
      const prompt = message.content.replace(botMentionRegex, '').trim();

      if (!prompt) {
        return message.reply({
          content: `👋 Hello ${message.author}! Mention me with a question or prompt (or use \`/ai\`) to chat with me powered by Gemini AI!`
        }).catch(() => {});
      }

      try {
        await message.channel.sendTyping();

        const responseText = await gemini.generateResponse(prompt, {
          userTag: message.author.tag,
          guildName: message.guild.name
        });

        const chunks = gemini.splitForDiscord(responseText);

        for (let i = 0; i < chunks.length; i++) {
          if (i === 0) {
            await message.reply({
              content: chunks[i],
              allowedMentions: { repliedUser: true }
            });
          } else {
            await message.channel.send({
              content: chunks[i],
              allowedMentions: { repliedUser: false }
            });
          }
        }
      } catch (aiError) {
        console.error('[MessageCreate] Error during mention AI response:', aiError);
        message.reply({
          content: '⚠️ I encountered an error while processing your request with Gemini AI.'
        }).catch(() => {});
      }
    }
  }
};
