const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const Discord = require("discord.js")

const { readdirSync } = require("fs")

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const config = require("./config.json")

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
	console.log(`Ready! Logged in as ${c.user.tag}`);
});


client.on(Events.InteractionCreate, interaction => {
    if(!interaction.isCommand()) return
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
})

function getPermissionName(value) {
    let object = Discord.PermissionsBitField.Flags
    return Object.keys(object).find(key => object[key] === value);
}

client.login(config.token)
