// index.js
// Load environment variables from a .env file
require('dotenv').config();
// Import necessary classes from the discord.js library
const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
// Import Node.js's built-in 'fs' (file system) and 'path' modules
const fs = require('fs');
const path = require('path');

// Create a new Client instance
const client = new Client({
  // Define the 'intents' for the bot. These are a set of permissions your bot needs
  // to receive certain events from Discord.
  intents: [
    GatewayIntentBits.Guilds, // Required for basic server functionality
    GatewayIntentBits.GuildMessages, // Required to receive message events
    GatewayIntentBits.MessageContent, // Required to read the content of messages
    GatewayIntentBits.GuildVoiceStates // Required for voice channel events
  ]
});

// Attach a .commands property to the client instance.
// We'll use this to store and access our commands. A Collection is an extended Map, which is very useful.
client.commands = new Collection();

const session = {
    isActive: false,
    queue: [],
    currentSpeaker: null,
    spoken: [],
    speakingTime: 0,
    feedbackTime: 0,
    voiceChannel: null,
    textChannel: null,
    timer: null,
};

// --- DYNAMIC COMMAND LOADER ---
// Construct the path to the 'commands' directory
const commandsPath = path.join(__dirname, 'commands');
// Read all files in the 'commands' directory that end with .js
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Loop over each command file
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // 'require' the command file to load its content
  const command = require(filePath);
  // Check if the loaded command has the required 'data' and 'execute' properties
  if ('data' in command && 'execute' in command) {
    // If it's a valid command, add it to the client.commands Collection
    // The key is the command's name, and the value is the command object itself.
    client.commands.set(command.data.name, command);
  } else {
    // If it's missing 'data' or 'execute', log a warning to the console.
    console.warn(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// --- EVENT LISTENERS ---

// This event listener will run once when the client is ready and successfully logged in.
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag} v2`);

  const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);
  const commands = client.commands.map(cmd => cmd.data.toJSON());

  try {
    // Register commands for every guild the bot is in
    for (const [guildId] of client.guilds.cache) {
      console.log(`Registering commands for guild: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commands },
      );
    }
    console.log('Successfully reloaded application (/) commands for all guilds.');
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isButton()) {
      console.log(`[Button] customId: ${interaction.customId}, isActive: ${session.isActive}`);
      if (!session.isActive) {
        console.warn('[Button] Failure: No stand-up in progress.');
        return interaction.reply({ content: 'No stand-up in progress.', flags: 64 });
      }
      if (interaction.customId === 'next_speaker') {
        console.log('[Button] Next speaker pressed.');
        const nextCommand = client.commands.get('next');
        await nextCommand.execute(interaction, session);
        return;
      }
      if (interaction.customId === 'end_standup') {
        console.log('[Button] End standup pressed.');
        session.isActive = false;
        session.currentSpeaker = null;
        session.queue = [];
        session.spoken = [];
        session.timer = null;
        await interaction.update({ content: 'Stand-up ended.', embeds: [], components: [] });
        return;
      }
      // Unknown button
      console.warn(`[Button] Failure: Unknown button customId: ${interaction.customId}`);
      return interaction.reply({ content: 'Unknown button.', flags: 64 });
    }

    // This event listener will run every time an interaction is created (e.g., a slash command is used).
    if (!interaction.isChatInputCommand()) return;

    // Get the command object from the client.commands Collection based on the interaction's command name.
    const command = client.commands.get(interaction.commandName);

    // If no command with that name exists, do nothing.
    if (!command) {
      console.warn(`[Slash] Failure: Command not found: ${interaction.commandName}`);
      return;
    }

    try {
      // Try to execute the command's 'execute' method, passing in the interaction object.
      await command.execute(interaction, session);
    } catch (error) {
      // If an error occurs during command execution, log it to the console.
      console.error(`[Slash] Failure: Error executing command ${interaction.commandName}:`, error);
      await interaction.reply({ content: '❌ There was an error executing that command.', flags: 64 });
    }
  } catch (outerError) {
    console.error('[Global] Unhandled error in InteractionCreate:', outerError);
    try {
      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Bot error. Please try again.', flags: 64 });
      }
    } catch (replyError) {
      console.error('[Global] Failed to reply to interaction after error:', replyError);
    }
  }
});

// Log the bot into Discord using the token from your .env file.
client.login(process.env.BOT_TOKEN);
