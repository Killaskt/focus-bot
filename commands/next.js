const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function logSession(session, label = '') {
    console.log(`[${label}] isActive:`, session.isActive,
        '| currentSpeaker:', session.currentSpeaker && session.currentSpeaker.username,
        '| queue:', session.queue.map(u => u.username),
        '| spoken:', session.spoken.map(u => u.username),
        '| transitioning:', session.transitioning);
}

async function sendStandupEmbed(interaction, session) {
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
            .setCustomId('back_speaker')
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('end_standup')
            .setLabel('End Standup')
            .setStyle(ButtonStyle.Danger)
    );
    try {
        if (session.standupMessage) {
            await session.standupMessage.edit({ embeds: [embed], components: [row] });
        } else {
            // Use tethered channel if set
            const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
            if (!targetChannel) {
                console.error(`[Tether] Could not find tethered channel with ID ${session.tetheredChannelId}. Defaulting to current channel.`);
            }
            const msg = await (targetChannel || interaction.channel).send({ embeds: [embed], components: [row] });
            session.standupMessage = msg;
            console.log(`[Standup] Standup embed sent to #${(targetChannel || interaction.channel).name} (${(targetChannel || interaction.channel).id})`);
        }
    } catch (e) {
        console.error('Failed to update standup embed:', e);
    }
}

function startTurn(interaction, session) {
    return new Promise((resolve) => {
        logSession(session, 'startTurn (before)');
        if (session.transitioning) {
            console.log('Transition in progress, ignoring.');
            resolve();
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
            resolve();
            return;
        }
        if (session.currentSpeaker) {
            session.spoken.push(session.currentSpeaker);
        }
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
        session.currentSpeaker = session.queue.shift();
        session.turnStartTime = Date.now();
        if (!session.currentSpeaker) {
            console.log('No current speaker after shift, ending standup.');
            endStandup(interaction, session);
            session.transitioning = false;
            resolve();
            return;
        }
        sendStandupEmbed(interaction, session).then(() => {
            session.timer = setTimeout(() => {
                console.log(`Timer up for ${session.currentSpeaker.username}`);
                // Use tethered channel if set
                const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
                if (!targetChannel) {
                    console.error(`[Tether] Could not find tethered channel with ID ${session.tetheredChannelId}. Defaulting to current channel.`);
                }
                targetChannel.send(`${session.currentSpeaker.username}'s time is up!`);
                console.log(`[Standup] 'Time is up' message sent to #${(targetChannel || interaction.channel).name} (${(targetChannel || interaction.channel).id})`);
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
            resolve();
        });
    });
}

function startFeedback(interaction, session) {
    console.log(`Feedback for ${session.currentSpeaker && session.currentSpeaker.username}`);
    // Use tethered channel if set
    const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
    if (!targetChannel) {
        console.error(`[Tether] Could not find tethered channel with ID ${session.tetheredChannelId}. Defaulting to current channel.`);
    }
    targetChannel.send(`Feedback time for ${session.currentSpeaker.username} has started.`);
    session.timer = setTimeout(() => {
        console.log(`Feedback time over for ${session.currentSpeaker && session.currentSpeaker.username}`);
        // Use tethered channel if set
        const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
        if (!targetChannel) {
            console.error(`[Tether] Could not find tethered channel with ID ${session.tetheredChannelId}. Defaulting to current channel.`);
        }
        targetChannel.send(`Feedback time is over.`);
        console.log(`[Standup] Feedback end message sent to #${(targetChannel || interaction.channel).name} (${(targetChannel || interaction.channel).id})`);
        if (session.queue.length > 0) {
            startTurn(interaction, session);
        } else {
            endStandup(interaction, session);
        }
    }, session.feedbackTime);
}

async function endStandup(interaction, session) {
    console.log('Ending standup.');
    session.transitioning = false;
    if (session.standupMessage) {
        session.standupMessage.edit({ content: 'Stand-up ended.', embeds: [], components: [] });
        session.standupMessage = null;
    }
    // Use tethered channel if set
    const targetChannel = session.tetheredChannelId ? interaction.client.channels.cache.get(session.tetheredChannelId) : interaction.channel;
    if (!targetChannel) {
        console.error(`[Tether] Could not find tethered channel with ID ${session.tetheredChannelId}. Defaulting to current channel.`);
    }
    await (targetChannel || interaction.channel).send('The stand-up has ended.');
    console.log(`[Standup] Standup ended message sent to #${(targetChannel || interaction.channel).name} (${(targetChannel || interaction.channel).id})`);
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
            if (interaction.isChatInputCommand()) {
                return interaction.reply({ content: 'There is no stand-up in progress.', flags: 64 }); // ephemeral
            } else if (interaction.isButton()) {
                if (session.standupMessage) {
                    await session.standupMessage.edit({ content: 'No stand-up in progress.', embeds: [], components: [] });
                }
                try { await interaction.update({}); } catch (e) {}
                return;
            }
        }

        if (!isFirstTurn && interaction.user.id !== session.currentSpeaker.id) {
            // return interaction.reply({ content: 'Only the current speaker can end their turn.', ephemeral: true });
        }

        if (session.queue.length > 0) {
            await startTurn(interaction, session);
        } else {
            endStandup(interaction, session);
        }

        if (!isFirstTurn && interaction.isChatInputCommand()) {
            await interaction.reply({ content: 'Moving to the next speaker.', flags: 64 }); // ephemeral
        } else if (interaction.isButton()) {
            try { await interaction.update({}); } catch (e) {}
        }
    },
};
