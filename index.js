const fs = require('fs');
const path = require('path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const chalk = require('chalk');

const databasePath = path.join(__dirname, './server.json');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const imagesPath = path.join(__dirname, 'images');
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Load commands
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

function loadDatabase() {
    if (fs.existsSync(databasePath)) {
        return JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    }
    return {};
}

async function sendRandomImageToServers() {
    const db = loadDatabase();
    const randomImage = getRandomImage();
    if (!randomImage) {
        console.log(chalk.blue.bgRed.bold('No images found in the images folder.'));
        return;
    }

    for (const [guildId, channelId] of Object.entries(db)) {
        try {
            // Fetch guild and ensure it exists
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                console.warn(chalk.blue.bgRed.bold(`Guild with ID ${guildId} not found.`));
                continue;
            }

            // Fetch all channels in the guild and find the matching one
            const channels = await guild.channels.fetch();
            const targetChannel = channels.get(channelId);

            if (targetChannel && targetChannel.isTextBased()) {
                await targetChannel.send({
                    files: [randomImage]
                });
                console.log(chalk.blue.bgGreenBright.bold(`Sent image to channel ${channelId} in guild ${guildId}`));
            } else {
                console.warn(chalk.blue.bgRed.bold(`Channel with ID ${channelId} not found or is not text-based for guild ${guildId}`));
            }
        } catch (err) {
            console.error(chalk.blue.bgRed.bold(`Error sending image to guild ${guildId}:`, err));
        }
    }
}

client.once(Events.ClientReady, async () => {
    console.log(chalk.blue.bgGreenBright.bold(`Ready! Logged in as ${client.user.tag}`));

    // Initial sending and scheduling subsequent sends every 24 hours
    await sendRandomImageToServers();
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
