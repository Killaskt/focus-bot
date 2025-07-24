const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settetherchannel')
        .setDescription('Tether the bot to the current channel for all standup messages.'),
    async execute(interaction, session) {
        session.tetheredChannelId = interaction.channel.id;
        await interaction.reply({ content: `✅ Standup bot is now tethered to <#${interaction.channel.id}>. All standup messages will go there.`, flags: 64 });
    },
};
