const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startstandup')
        .setDescription('Initiates a stand-up session.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The voice channel for the stand-up')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice))
        .addIntegerOption(option =>
            option.setName('speakingtime')
                .setDescription('The time each person has to speak in minutes')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('feedbacktime')
                .setDescription('The time for feedback after each speaker in minutes')
                .setRequired(true)),
    async execute(interaction, session) {
        if (session.isActive) {
            return interaction.reply({ content: 'A stand-up is already in progress.', ephemeral: true });
        }

        const voiceChannel = interaction.options.getChannel('channel');
        const speakingTime = interaction.options.getInteger('speakingtime');
        const feedbackTime = interaction.options.getInteger('feedbacktime');

        const members = voiceChannel.members.map(member => member.user);
        if (members.length === 0) {
            return interaction.reply({ content: 'There are no users in the specified voice channel.', ephemeral: true });
        }

        session.isActive = true;
        session.queue = members.sort(() => Math.random() - 0.5);
        session.currentSpeaker = null;
        session.spoken = [];
        session.speakingTime = speakingTime * 60 * 1000;
        session.feedbackTime = feedbackTime * 60 * 1000;
        session.voiceChannel = voiceChannel;
        session.textChannel = interaction.channel;

        // Build the rich embed message
        const embed = new EmbedBuilder()
            .setTitle('Current Standup')
            .setDescription(session.queue.map((u, i) => `${i === 0 ? '➡️ ' : ''}${u.username}`).join('\n'))
            .setColor(0x00AE86);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('next_speaker')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('end_standup')
                .setLabel('End Standup')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row] });

        // Start the first person's turn
        const nextCommand = interaction.client.commands.get('next');
        await nextCommand.execute(interaction, session, true);

    },
};
