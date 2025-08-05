const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const Discord = require("discord.js")

const { readdirSync } = require("fs")

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const config = require("./config.json")

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error)
    console.error('Stack:', error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise)
    console.error('Reason:', reason)
})

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Gracefully shutting down...')
    client.destroy()
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('\n🔄 Gracefully shutting down...')
    client.destroy()
    process.exit(0)
})

const commands = new Collection()

const files = readdirSync("./commands")
const filesName = files.map(file => file.replace(".js", ""))
for(const fileName of filesName) {
    const command = require(`./commands/${fileName}`)
    const data = new command()
    data.integration_types = [0, 1] // 0 = GuildInstall, 1 = UserInstall
    data.contexts = [0, 1, 2] // 0 = Guild, 1 = BotDM, 2 = PrivateChannel
    commands.set(data.name, data)
}

client.once(Events.ClientReady, c => {
    client.application.commands.set(commands.map(({ execute, ...data }) => data))
    client.user.setActivity('your proxies', { type: Discord.ActivityType.Watching });
	console.log(`Ready! Logged in as ${c.user.tag}`);
});


client.on(Events.InteractionCreate, interaction => {
    if(interaction.isCommand()) {
        if(!commands.has(interaction.commandName)) return
        try {
            let command = commands.get(interaction.commandName)
            
            // Skip permission check for user installs (DMs)
            if (interaction.guild && !interaction.member.permissions.has(command.permission)) {
                return interaction.reply({ content: config.permission.base.replaceAll("{perm}", getPermissionName(command.permission)) });
            }
            
            command.execute(interaction, client)
        } catch (error) {
            console.error(error)
        }
    } else if (interaction.isButton()) {
        // Handle button interactions for custom-configuration
        if (interaction.customId.startsWith('edit_config_') || interaction.customId.startsWith('clear_config_')) {
            const CustomConfigCommand = require('./commands/custom-configuration')
            CustomConfigCommand.handleButtonInteraction(interaction)
        }
    } else if (interaction.isModalSubmit()) {
        // Handle modal submissions for custom-configuration
        if (interaction.customId.startsWith('config_modal_')) {
            const CustomConfigCommand = require('./commands/custom-configuration')
            CustomConfigCommand.handleModalSubmit(interaction)
        }
    }
})

function getPermissionName(value) {
    let object = Discord.PermissionsBitField.Flags
    return Object.keys(object).find(key => object[key] === value);
}

client.login(config.token)
