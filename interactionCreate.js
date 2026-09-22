const { Events, EmbedBuilder, Collection } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`[InteractionCreate] No command matching ${interaction.commandName} was found.`);
        return;
      }

      // 2. Cooldown Enforcement
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 3; // 3 seconds default
      const cooldownAmount = (command.cooldown || defaultCooldownDuration) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          return interaction.reply({
            content: `⏳ Please wait! You can use \`/${command.data.name}\` again <t:${expiredTimestamp}:R>.`,
            ephemeral: true
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      // 3. Execute Command with crash protection
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`[InteractionCreate] Error executing command ${interaction.commandName}:`, error);

        const errorEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('Command Execution Error')
          .setDescription('⚠️ There was an unexpected error while executing this command. The issue has been logged.')
          .setFooter({ text: config.bot.footerText });

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
      }
    }

    // 4. Handle Autocomplete interactions
    else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction, client);
      } catch (error) {
        console.error(`[InteractionCreate] Error in autocomplete for ${interaction.commandName}:`, error);
      }
    }

    // 5. Handle Interactive Buttons (e.g., Upvoting on Media Posts)
    else if (interaction.isButton()) {
      if (interaction.customId.startsWith('upvote_post_')) {
        try {
          const originalEmbed = interaction.message.embeds[0];
          if (!originalEmbed) return interaction.reply({ content: 'Post not found.', ephemeral: true });

          // Extract current upvote count
          const currentFooter = originalEmbed.footer?.text || '';
          const match = currentFooter.match(/Upvotes:\s*(\d+)/);
          const currentUpvotes = match ? parseInt(match[1], 10) : 0;
          const newUpvotes = currentUpvotes + 1;

          const updatedEmbed = EmbedBuilder.from(originalEmbed)
            .setFooter({ text: `Submitted by author • Upvotes: ${newUpvotes}` });

          await interaction.message.edit({ embeds: [updatedEmbed] });
          await interaction.reply({ content: `👍 You upvoted this post! (Total: ${newUpvotes})`, ephemeral: true });
        } catch (err) {
          console.error('[ButtonInteraction] Error processing post upvote:', err);
          await interaction.reply({ content: 'Could not record upvote.', ephemeral: true }).catch(() => {});
        }
      }
    }
  }
};
