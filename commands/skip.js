
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips a specific person in the queue.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to skip')
                .setRequired(true)),
    async execute(interaction, session) {
        if (!session.isActive) {
            return interaction.reply({ content: 'There is no stand-up in progress.', ephemeral: true });
        }

        const userToSkip = interaction.options.getUser('user');
        const index = session.queue.findIndex(user => user.id === userToSkip.id);

        if (index === -1) {
            return interaction.reply({ content: 'That user is not in the queue.', ephemeral: true });
        }

        session.queue.splice(index, 1);
        await interaction.reply({ content: `${userToSkip.username} has been skipped.` });
    },
};
