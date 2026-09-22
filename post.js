const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType 
} = require('discord.js');
const db = require('../../services/database');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post')
    .setDescription('Publish formatted media, creative assets, or resources to a community showcase channel.')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('A catchy, descriptive title for your showcase')
        .setRequired(true)
        // Character length limit removed completely
    )
    .addAttachmentOption(option =>
      option.setName('attachment')
        .setDescription('Upload an image, graphic, clip, or file to showcase')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('link')
        .setDescription('External URL to media, GitHub repo, YouTube, or tool')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('category')
        .setDescription('The category best describing your post')
        .setRequired(false)
        .addChoices(
          ...config.mediaPosting.allowedCategories.map(cat => ({ name: cat, value: cat }))
        )
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Add description, lore, tools used, or notes')
        .setRequired(false)
        .setMaxLength(2000)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Specific text channel to post to (overrides default media channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  cooldown: 10, // 10 second cooldown to prevent spam

  async execute(interaction, client) {
    const title = interaction.options.getString('title');
    const attachment = interaction.options.getAttachment('attachment');
    const link = interaction.options.getString('link');
    const category = interaction.options.getString('category') || config.mediaPosting.defaultCategory || 'General';
    const description = interaction.options.getString('description') || 'No description provided.';
    const customChannel = interaction.options.getChannel('channel');

    // Determine target channel
    const defaultChannelId = process.env.MEDIA_CHANNEL_ID;
    const targetChannel = customChannel || 
      (defaultChannelId ? interaction.guild.channels.cache.get(defaultChannelId) : null) || 
      interaction.channel;

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.reply({
        content: '⚠️ **Channel Error:** Target showcase channel could not be found or is not a text channel.',
        ephemeral: true
      });
    }

    // Check bot permissions in target channel
    const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions || !botPermissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
      return interaction.reply({
        content: `⚠️ **Permission Error:** The bot lacks permission to post embeds in ${targetChannel}.`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // Determine primary media URL
    let mediaUrl = null;
    let isImageOrGif = false;

    if (attachment) {
      mediaUrl = attachment.url;
      const contentType = attachment.contentType || '';
      isImageOrGif = contentType.startsWith('image/') || contentType.includes('gif');
    } else if (link) {
      mediaUrl = link;
      isImageOrGif = /\.(jpeg|jpg|gif|png|webp)($|\?)/i.test(link);
    }

    // Build aesthetic showcase embed
    const showcaseEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({
        name: `${interaction.user.tag} • Community Creator`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`🏷️ [${category}]${title}`)
      .setDescription(description)
      .addFields(
        { name: 'Category', value: `\`${category}\``, inline: true },
        { name: 'Creator', value: `${interaction.user}`, inline: true }
      )
      .setFooter({ text: 'Submitted by author • Upvotes: 0' })
      .setTimestamp();

    if (link) {
      showcaseEmbed.addFields({ name: 'External Link', value: `[Visit Resource](${link})`, inline: true });
    }

    if (mediaUrl && isImageOrGif) {
      showcaseEmbed.setImage(mediaUrl);
    }

    // Interactive Action Row
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`upvote_post_${Date.now()}`)
        .setLabel('Upvote')
        .setEmoji('👍')
        .setStyle(ButtonStyle.Primary)
    );

    if (link && /^https?:\/\//i.test(link)) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setLabel('Open Link')
          .setStyle(ButtonStyle.Link)
          .setURL(link)
      );
    }

    try {
      const publishedMessage = await targetChannel.send({
        embeds: [showcaseEmbed],
        components: [actionRow]
      });

      // Save post in database
      db.createPost({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: targetChannel.id,
        messageId: publishedMessage.id,
        title,
        category,
        mediaUrl,
        description
      });

      return interaction.editReply({
        content: `✅ **Showcase Published!** Your post is live in ${targetChannel}: [Jump to Post](${publishedMessage.url})`
      });
    } catch (err) {
      console.error('[PostCommand] Error publishing post:', err);
      return interaction.editReply({
        content: `❌ **Failed to send post:** ${err.message}`
      });
    }
  }
};