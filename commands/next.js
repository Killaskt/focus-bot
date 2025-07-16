
const { SlashCommandBuilder } = require('@discordjs/builders');

function startTurn(interaction, session) {
    if (session.timer) {
        clearTimeout(session.timer);
    }

    session.currentSpeaker = session.queue.shift();
    session.spoken.push(session.currentSpeaker);

    interaction.channel.send(`It\'s ${session.currentSpeaker.username}\'s turn to speak.`);

    session.timer = setTimeout(() => {
        interaction.channel.send(`${session.currentSpeaker.username}\'s time is up!`);
        if (session.feedbackTime > 0) {
            startFeedback(interaction, session);
        } else {
            if (session.queue.length > 0) {
                startTurn(interaction, session);
            } else {
                endStandup(interaction, session);
            }
        }
    }, session.speakingTime);
}

function startFeedback(interaction, session) {
    interaction.channel.send(`Feedback time for ${session.currentSpeaker.username} has started.`);
    session.timer = setTimeout(() => {
        interaction.channel.send(`Feedback time is over.`);
        if (session.queue.length > 0) {
            startTurn(interaction, session);
        } else {
            endStandup(interaction, session);
        }
    }, session.feedbackTime);
}

function endStandup(interaction, session) {
    interaction.channel.send('The stand-up has ended.');
    session.isActive = false;
    session.currentSpeaker = null;
    session.queue = [];
    session.spoken = [];
    session.timer = null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('next')
        .setDescription('Moves to the next speaker.'),
    async execute(interaction, session, isFirstTurn = false) {
        if (!session.isActive) {
            return interaction.reply({ content: 'There is no stand-up in progress.', ephemeral: true });
        }

        if (!isFirstTurn && interaction.user.id !== session.currentSpeaker.id) {
            // return interaction.reply({ content: 'Only the current speaker can end their turn.', ephemeral: true });
        }

        if (session.queue.length > 0) {
            startTurn(interaction, session);
        } else {
            endStandup(interaction, session);
        }

        if (!isFirstTurn) {
            await interaction.reply({ content: 'Moving to the next speaker.', ephemeral: true });
        }
    },
};
