const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endstandup')
        .setDescription('Terminates the session early.'),
    async execute(interaction, session) {
        if (!session.isActive) {
            return interaction.reply({ content: 'There is no stand-up in progress.', ephemeral: true });
        }

        if (session.timer) {
            clearTimeout(session.timer);
        }

        session.isActive = false;
        session.currentSpeaker = null;
        session.queue = [];
        session.spoken = [];
        session.timer = null;

        // Try to update the original standup message if stored
        if (session.standupMessage) {
            try {
                await session.standupMessage.edit({ content: 'Stand-up ended.', embeds: [], components: [] });
            } catch (e) { /* ignore if message is gone */ }
            session.standupMessage = null;
        }

        await interaction.reply({ content: 'Stand-up ended.', ephemeral: true });
    },
};
