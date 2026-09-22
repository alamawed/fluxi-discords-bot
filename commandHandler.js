const fs = require('fs');
const path = require('path');

function loadCommands(client) {
    const rootPath = __dirname;
    const skipFiles = [
        'index.js', 
        'commandHandler.js', 
        'eventHandler.js', 
        'playerHandler.js', 
        'deploy-commands.js',
        'database.js',
        'gemini.js',
        'ai.js',
        'guildMemberAdd.js',
        'interactionCreate.js',
        'messageCreate.js',
        'messageDelete.js',
        'messageUpdate.js',
        'ready.js'
    ];

    const files = fs.readdirSync(rootPath).filter(file => file.endsWith('.js') && !skipFiles.includes(file));
    let loadedCount = 0;

    for (const file of files) {
        const filePath = path.join(rootPath, file);
        try {
            const command = require(filePath);
            if (command && 'data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                loadedCount++;
            }
        } catch (err) {
            console.error(`[CommandHandler] Error loading command ${file}:`, err);
        }
    }

    console.log(`[CommandHandler] Successfully loaded ${loadedCount} slash commands.`);
}

module.exports = loadCommands;