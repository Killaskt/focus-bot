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

        // Use tethered channel if set
        const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
        if (!targetChannel) {
            console.error(`[Tether] Could not find tethered channel with ID ${session.tetheredChannelId}. Defaulting to current channel.`);
        }
        await (targetChannel || interaction.channel).send('Stand-up ended.');
        console.log(`[Standup] Standup ended message sent to #${(targetChannel || interaction.channel).name} (${(targetChannel || interaction.channel).id})`);

        // At the end, send statistics to the tethered channel
        const statsArr = Object.entries(session.stats).map(([userId, stat]) => ({ userId, ...stat }));
        if (statsArr.length > 0) {
            const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
            const longest = statsArr.reduce((a, b) => (a.longest > b.longest ? a : b));
            const shortest = statsArr.reduce((a, b) => (a.shortest < b.shortest ? a : b));
            const statsEmbed = {
                title: 'Standup Statistics',
                description: `Back button used: ${session.backActions} times`,
                fields: statsArr.map(stat => ({
                    name: `<@${stat.userId}>`,
                    value: `Total: ${(stat.totalTime/1000).toFixed(1)}s\nTurns: ${stat.turns}\nAvg: ${(stat.totalTime/stat.turns/1000).toFixed(1)}s\nLongest: ${(stat.longest/1000).toFixed(1)}s\nShortest: ${(stat.shortest/1000).toFixed(1)}s`,
                    inline: true
                })),
                color: 0x00AE86
            };
            const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
            if (targetChannel) {
                targetChannel.send({ embeds: [statsEmbed] });
            }
        }

        await interaction.reply({ content: 'Stand-up ended.', ephemeral: true });
    },
};
