const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function logSession(session, label = '') {
    console.log(`[${label}] isActive:`, session.isActive,
        '| currentSpeaker:', session.currentSpeaker && session.currentSpeaker.username,
        '| queue:', session.queue.map(u => u.username),
        '| spoken:', session.spoken.map(u => u.username),
        '| transitioning:', session.transitioning);
}

function sendStandupEmbed(interaction, session) {
    logSession(session, 'sendStandupEmbed');
    const allUsers = [session.currentSpeaker, ...session.queue].filter(Boolean);
    const embed = new EmbedBuilder()
        .setTitle('Current Standup')
        .setDescription(
            allUsers.map((u, i) => {
                if (!u) return '';
                if (i === 0) return `➡️ **${u.username}**`;
                return u.username;
            }).join('\n')
        )
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
    if (session.standupMessage) {
        session.standupMessage.edit({ embeds: [embed], components: [row] });
    } else {
        interaction.channel.send({ embeds: [embed], components: [row] });
    }
}

function startTurn(interaction, session) {
    logSession(session, 'startTurn (before)');
    if (session.transitioning) {
        console.log('Transition in progress, ignoring.');
        return;
    }
    session.transitioning = true;
    if (session.timer) {
        clearTimeout(session.timer);
    }
    // Only advance if there is a next speaker
    if (session.queue.length === 0) {
        console.log('No next speaker, ending standup.');
        endStandup(interaction, session);
        session.transitioning = false;
        return;
    }
    if (session.currentSpeaker) {
        session.spoken.push(session.currentSpeaker);
    }
    session.currentSpeaker = session.queue.shift();
    if (!session.currentSpeaker) {
        console.log('No current speaker after shift, ending standup.');
        endStandup(interaction, session);
        session.transitioning = false;
        return;
    }
    sendStandupEmbed(interaction, session);
    session.timer = setTimeout(() => {
        console.log(`Timer up for ${session.currentSpeaker.username}`);
        interaction.channel.send(`${session.currentSpeaker.username}'s time is up!`);
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
    session.transitioning = false;
    logSession(session, 'startTurn (after)');
}

function startFeedback(interaction, session) {
    console.log(`Feedback for ${session.currentSpeaker && session.currentSpeaker.username}`);
    interaction.channel.send(`Feedback time for ${session.currentSpeaker.username} has started.`);
    session.timer = setTimeout(() => {
        console.log(`Feedback time over for ${session.currentSpeaker && session.currentSpeaker.username}`);
        interaction.channel.send(`Feedback time is over.`);
        if (session.queue.length > 0) {
            startTurn(interaction, session);
        } else {
            endStandup(interaction, session);
        }
    }, session.feedbackTime);
}

function endStandup(interaction, session) {
    console.log('Ending standup.');
    session.transitioning = false;
    if (session.standupMessage) {
        session.standupMessage.edit({ content: 'Stand-up ended.', embeds: [], components: [] });
        session.standupMessage = null;
    }
    interaction.channel.send('The stand-up has ended.');
    session.isActive = false;
    session.currentSpeaker = null;
    session.queue = [];
    session.spoken = [];
    session.timer = null;
    logSession(session, 'endStandup');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('next')
        .setDescription('Moves to the next speaker.'),
    sendStandupEmbed,
    async execute(interaction, session, isFirstTurn = false) {
        logSession(session, 'execute');
        if (!session.isActive) {
            console.log('No standup in progress at execute.');
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
