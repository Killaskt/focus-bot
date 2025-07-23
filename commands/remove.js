const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a user from the queue.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove')
                .setRequired(true)),
    async execute(interaction, session) {
        if (!session.isActive) {
            return interaction.reply({ content: 'There is no stand-up in progress.', ephemeral: true });
        }

        const userToRemove = interaction.options.getUser('user');
        const index = session.queue.findIndex(user => user.id === userToRemove.id);

        if (index === -1) {
            return interaction.reply({ content: 'That user is not in the queue.', ephemeral: true });
        }

        session.queue.splice(index, 1);
        if (session.standupMessage) {
            const nextCommand = interaction.client.commands.get('next');
            nextCommand.sendStandupEmbed(interaction, session);
        }
        await interaction.reply({ content: `${userToRemove.username} has been removed from the queue.` });
    },
};
