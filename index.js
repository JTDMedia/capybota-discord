const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const Database = require('easy-json-database');
const chalk = require('chalk')

const db = new Database(path.join(__dirname, '../server.json'));
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(chalk.blue.bgRed.bold(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
		}
	}
}

function getRandomImage() {
  const files = fs.readdirSync(imagesPath);
  const imageFiles = files.filter(file => /\.(png|jpe?g|gif)$/i.test(file));
  if (imageFiles.length === 0) return null;
  return path.join(imagesPath, imageFiles[Math.floor(Math.random() * imageFiles.length)]);
}

async function sendRandomImageToServers() {
  const randomImage = getRandomImage();
  if (!randomImage) {
      console.log(chalk.blue.bgRed.bold('No images found in the images folder.'));
      return;
  }

  for (const [serverId, channelId] of Object.entries(db.all())) {
      try {
          const channel = await client.channels.fetch(channelId);
          if (channel) {
              await channel.send({
                  files: [randomImage]
              });
              console.log(chalk.blue.bgGreenBright.bold(`Sent image to channel ${channelId} in server ${serverId}`));
          } else {
              console.warn(chalk.blue.bgRed.bold(`Channel with ID ${channelId} not found for server ${serverId}`));
          }
      } catch (err) {
          console.error(chalk.blue.bgRed.bold(`Error sending image to server ${serverId}:`, err));
      }
  }
}

client.once(Events.ClientReady, readyClient => {
	console.log(chalk.blue.bgGreenBright.bold(`Ready! Logged in as ${readyClient.user.tag}`));

      sendRandomImageToServers();
      setInterval(sendRandomImageToServers, 24 * 60 * 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(chalk.blue.bgRed.bold(`No command matching ${interaction.commandName} was found.`));
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

client.login(token);