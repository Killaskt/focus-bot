const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('back')
        .setDescription('Moves to the previous speaker.'),
    async execute(interaction, session, isButton = false) {
        if (!session.isActive) {
            if (!isButton) return interaction.reply({ content: 'There is no stand-up in progress.', flags: 64 });
            return;
        }
        if (!session.spoken || session.spoken.length < 1) {
            if (!isButton) return interaction.reply({ content: 'Cannot go back. No previous speaker.', flags: 64 });
            return;
        }
        // Move the current speaker back to the front of the queue
        if (session.currentSpeaker) {
            session.queue.unshift(session.currentSpeaker);
        }
        // Move the last spoken user back to current
        session.currentSpeaker = session.spoken.pop();
        if (session.timer) {
            clearTimeout(session.timer);
        }
        // Update the embed and reset timer
        const nextCommand = interaction.client.commands.get('next');
        nextCommand.sendStandupEmbed(interaction, session);
        session.timer = setTimeout(async () => {
            // Use tethered channel if set
            const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
            if (!targetChannel) {
                console.error(`[Tether] Could not find tethered channel with ID ${session.tetheredChannelId}. Defaulting to current channel.`);
            }
            await (targetChannel || interaction.channel).send(`${session.currentSpeaker.username}'s time is up!`);
            console.log(`[Standup] 'Time is up' message sent to #${(targetChannel || interaction.channel).name} (${(targetChannel || interaction.channel).id})`);
            if (session.feedbackTime > 0) {
                nextCommand.startFeedback(interaction, session);
            } else {
                if (session.queue.length > 0) {
                    nextCommand.startTurn(interaction, session);
                } else {
                    nextCommand.endStandup(interaction, session);
                }
            }
        }, session.speakingTime);
        // Track back button usage
        session.backActions = (session.backActions || 0) + 1;
        // Track time for previous speaker
        if (session.currentSpeaker && session.turnStartTime) {
            const userId = session.currentSpeaker.id;
            const now = Date.now();
            const duration = now - session.turnStartTime;
            if (!session.stats[userId]) session.stats[userId] = { totalTime: 0, turns: 0, longest: 0, shortest: Infinity };
            session.stats[userId].totalTime += duration;
            session.stats[userId].turns += 1;
            session.stats[userId].longest = Math.max(session.stats[userId].longest, duration);
            session.stats[userId].shortest = Math.min(session.stats[userId].shortest, duration);
        }
        session.turnStartTime = Date.now();
        if (!isButton) {
            await interaction.reply({ content: 'Moved to previous speaker.', flags: 64 });
        } else {
            try { await interaction.update({}); } catch (e) {}
        }
    },
};
