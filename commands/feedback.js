
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Sends written feedback to a specified user.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The feedback message')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to send feedback to (defaults to current speaker)'))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send feedback to (defaults to current channel)')
                .addChannelTypes(ChannelType.GuildText)),
    async execute(interaction, session) {
        const message = interaction.options.getString('message');
        const user = interaction.options.getUser('user') || session.currentSpeaker;
        const channel = interaction.options.getChannel('channel') || session.textChannel;

        if (!user) {
            return interaction.reply({ content: 'There is no one to give feedback to.', ephemeral: true });
        }

        if (!channel) {
            return interaction.reply({ content: 'There is no channel to send feedback to.', ephemeral: true });
        }

        try {
            await channel.send(`Feedback for ${user.username}: ${message}`);
            await interaction.reply({ content: 'Feedback sent!', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'I was unable to send the feedback.', ephemeral: true });
        }
    },
};
