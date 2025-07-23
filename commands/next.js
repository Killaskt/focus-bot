const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function sendStandupEmbed(channel, session) {
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
    channel.send({ embeds: [embed], components: [row] });
}

function startTurn(interaction, session) {
    if (session.transitioning) return;
    session.transitioning = true;
    if (session.timer) {
        clearTimeout(session.timer);
    }
    // Only advance if there is a next speaker
    if (session.queue.length === 0) {
        endStandup(interaction, session);
        session.transitioning = false;
        return;
    }
    if (session.currentSpeaker) {
        session.spoken.push(session.currentSpeaker);
    }
    session.currentSpeaker = session.queue.shift();
    if (!session.currentSpeaker) {
        endStandup(interaction, session);
        session.transitioning = false;
        return;
    }
    sendStandupEmbed(interaction.channel, session);
    session.timer = setTimeout(() => {
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
