const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Adds a user to the queue.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add')
                .setRequired(true)),
    async execute(interaction, session) {
        if (!session.isActive) {
            return interaction.reply({ content: 'There is no stand-up in progress.', ephemeral: true });
        }

        const userToAdd = interaction.options.getUser('user');
        if (session.queue.some(user => user.id === userToAdd.id) || session.spoken.some(user => user.id === userToAdd.id)) {
            return interaction.reply({ content: 'That user is already in the queue or has already spoken.', ephemeral: true });
        }

        session.queue.push(userToAdd);
        if (session.standupMessage) {
            const nextCommand = interaction.client.commands.get('next');
            // Only update the embed, don't advance turn
            nextCommand.sendStandupEmbed(interaction, session);
        }
        await interaction.reply({ content: `${userToAdd.username} has been added to the queue.` });
    },
};
