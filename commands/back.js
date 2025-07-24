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
        session.timer = setTimeout(() => {
            interaction.channel.send(`${session.currentSpeaker.username}'s time is up!`);
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
        if (!isButton) {
            await interaction.reply({ content: 'Moved to previous speaker.', flags: 64 });
        } else {
            try { await interaction.update({}); } catch (e) {}
        }
    },
};
