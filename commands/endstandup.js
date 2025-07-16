
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

        interaction.channel.send('The stand-up has been ended.');
        session.isActive = false;
        session.currentSpeaker = null;
        session.queue = [];
        session.spoken = [];
        session.timer = null;

        await interaction.reply({ content: 'Stand-up ended.', ephemeral: true });
    },
};
