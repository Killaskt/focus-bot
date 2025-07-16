
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
require('dotenv').config();

// --- CONFIGURATION ---
// https://discord.com/oauth2/authorize?client_id=1387554168960716991&permissions=17867067190336&integration_type=0&scope=bot
// You need to replace these with your own IDs
const clientId = '1387554168960716991'; // The bot's user ID
const guildId = '1083140541677568110';   // The server's ID
// --- END CONFIGURATION ---

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
