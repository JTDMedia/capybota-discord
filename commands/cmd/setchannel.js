const { SlashCommandBuilder } = require('discord.js');
const Database = require('easy-json-database');
const path = require('path');

const db = new Database(path.join(__dirname, '../server.json'));

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setchannel')
		.setDescription('Set a specific channel for the server.')
		.addStringOption(option =>
			option
				.setName('channelid')
				.setDescription('The ID of the channel to set.')
				.setRequired(true)),
	async execute(interaction) {
		if (!interaction.member.permissions.has('Administrator')) {
			return interaction.reply({
				content: 'You do not have permission to use this command. Administrator permissions are required.',
				ephemeral: true
			});
		}

		const serverId = interaction.guild.id;
		const channelId = interaction.options.getString('channelid');

		db.set(serverId, channelId);

		await interaction.reply(`Channel ID \`${channelId}\` has been set for this server.`);
	},
};
