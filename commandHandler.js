const fs = require('fs');
const path = require('path');

/**
 * Loads all slash commands from subdirectories inside the commands folder.
 * @param {import('discord.js').Client} client 
 */
function loadCommands(client) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.warn('[CommandHandler] Commands directory does not exist.');
        return;
    }

    const commandFolders = fs.readdirSync(commandsPath);
    let loadedCount = 0;

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        // Ensure it's a directory
        if (!fs.statSync(folderPath).isDirectory()) {
            continue;
        }

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);

                if (command && 'data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    loadedCount++;
                } else {
                    console.warn(`[CommandHandler] Command at ${filePath} is missing required "data" or "execute" property.`);
                }
            } catch (err) {
                console.error(`[CommandHandler] Error loading command ${file}:`, err);
            }
        }
    }

    console.log(`[CommandHandler] Successfully loaded ${loadedCount} slash commands.`);
}

module.exports = loadCommands;