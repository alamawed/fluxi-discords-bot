const fs = require('fs');
const path = require('path');

function loadEvents(client) {
    const rootPath = __dirname;
    const eventFiles = [
        'guildMemberAdd.js',
        'interactionCreate.js',
        'messageCreate.js',
        'messageDelete.js',
        'messageUpdate.js',
        'ready.js'
    ];

    let loadedCount = 0;

    for (const file of eventFiles) {
        const filePath = path.join(rootPath, file);
        if (fs.existsSync(filePath)) {
            try {
                const event = require(filePath);
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
    }

    console.log(`[EventHandler] Successfully loaded ${loadedCount} events.`);
}

module.exports = loadEvents;