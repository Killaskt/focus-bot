const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settetherchannel')
        .setDescription('Tether the bot to this channel for all standup messages.'),
    async execute(interaction, session) {
        session.tetheredChannelId = interaction.channel.id;
        console.log(`[Tether] Standup bot tethered to #${interaction.channel.name} (${interaction.channel.id}) by ${interaction.user.tag}`);
        await interaction.reply({ content: `✅ Standup bot is now tethered to <#${interaction.channel.id}>. All standup messages will go to this channel.`, flags: 64 });
    },
};
