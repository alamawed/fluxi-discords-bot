const fs = require('fs');
const path = require('path');

/**
 * Loads all event listeners from the events folder.
 * @param {import('discord.js').Client} client 
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');

  if (!fs.existsSync(eventsPath)) {
    console.warn('[EventHandler] Events directory does not exist.');
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  let loadedCount = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);

      if (!event.name || !event.execute) {
        console.warn(`[EventHandler] Event file ${file} is missing "name" or "execute" export.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      loadedCount++;
    } catch (err) {
      console.error(`[EventHandler] Error loading event ${file}:`, err);
    }
  }

  console.log(`[EventHandler] Successfully loaded ${loadedCount} client event listeners.`);
}

module.exports = { loadEvents };
