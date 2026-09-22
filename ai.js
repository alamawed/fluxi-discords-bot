const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gemini = require('../../services/gemini');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Ask Google Gemini AI (gemini-2.5-flash) anything directly in Discord.')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Your question, coding query, or creative instruction')
        .setRequired(true)
        .setMaxLength(1500)
    )
    .addStringOption(option =>
      option.setName('style')
        .setDescription('Tone or perspective for Gemini response')
        .setRequired(false)
        .addChoices(
          { name: 'Concise & Direct', value: 'concise' },
          { name: 'Code & Technical', value: 'code' },
          { name: 'Creative & Brainstorming', value: 'creative' },
          { name: 'Detailed & Analytical', value: 'analytical' }
        )
    ),

  cooldown: 5, // 5s rate-limit safeguard

  async execute(interaction, client) {
    const prompt = interaction.options.getString('prompt');
    const style = interaction.options.getString('style') || 'concise';

    await interaction.deferReply();

    // Map style to prompt nuance
    let systemAddon = '';
    if (style === 'concise') systemAddon = 'Provide a brief, direct answer without excessive conversational filler.';
    if (style === 'code') systemAddon = 'Focus on writing optimal, clean, well-commented code snippets with concise architectural notes.';
    if (style === 'creative') systemAddon = 'Be imaginative, vivid, and brainstorm creative ideas.';
    if (style === 'analytical') systemAddon = 'Provide a deeply structured, step-by-step breakdown.';

    const fullPrompt = systemAddon ? `${systemAddon}\n\nPrompt: ${prompt}` : prompt;

    try {
      const response = await gemini.generateResponse(fullPrompt, {
        userTag: interaction.user.tag,
        guildName: interaction.guild?.name || 'Discord Server'
      });

      const chunks = gemini.splitForDiscord(response, 1900);

      // Send first chunk in a stylized embed
      const initialEmbed = new EmbedBuilder()
        .setColor(config.colors.ai || '#1ABC9C')
        .setAuthor({
          name: `Gemini AI (${style})`,
          iconURL: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'
        })
        .setTitle(`💬 "${prompt.length > 80 ? prompt.slice(0, 77) + '...' : prompt}"`)
        .setDescription(chunks[0])
        .setFooter({ text: `${config.bot.footerText} • Powered by gemini-2.5-flash` })
        .setTimestamp();

      await interaction.editReply({ embeds: [initialEmbed] });

      // If the response spans across multiple chunks, send follow-ups
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i] });
      }
    } catch (err) {
      console.error('[AICommand] Execution error:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('AI Generation Failed')
        .setDescription('An unexpected error occurred while communicating with Google Gemini.')
        .setFooter({ text: 'Please check your GEMINI_API_KEY or try again shortly.' });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
