const { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } = require("discord.js")
const { findProxy } = require("../nginxPM/findProxy")
const fs = require('fs')

module.exports = class {
    constructor() {
        this.name = "info-proxy"
        this.description = "Get detailed information about one of your reverse proxies"
        this.integration_types = [0, 1] // Guild and User install
        this.contexts = [0, 1, 2] // Guild, Bot DM, Private Channel
        this.options = [
            { 
                type: ApplicationCommandOptionType["String"], 
                name: "domain", 
                description: "The domain name to get info about", 
                required: true 
            }
        ]
        this.permission = PermissionsBitField.Flags.SendMessages
    }

    async execute(interaction) {
        await interaction.deferReply()

        const domain = interaction.options.getString("domain").toLowerCase().trim()
        const userId = interaction.user.id

        try {
            // Validate input
            if (!domain || domain.includes(' ')) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Invalid Domain")
                    .setDescription("Domain name cannot be empty or contain spaces.")
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Load data
            let data = {}
            try {
                data = JSON.parse(fs.readFileSync('./data.json', 'utf8'))
            } catch (err) {
                // If file doesn't exist, create empty structure
                data = { users: {} }
            }
            
            if (!data.users || !data.users[userId] || !data.users[userId].proxies || data.users[userId].proxies.length === 0) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ No proxies found")
                    .setDescription("You don't have any proxies created.")
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            const userProxies = data.users[userId].proxies
            const proxy = userProxies.find(p => p.domain === domain)
            
            if (!proxy) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Proxy not found")
                    .setDescription(`You don't have a proxy for the domain \`${domain}\`.`)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Check status on Nginx PM
            const existingProxy = await findProxy(domain)
            const status = existingProxy ? "🟢 Active" : "🔴 Inactive"

            const infoEmbed = new EmbedBuilder()
                .setColor(existingProxy ? 0x00FF00 : 0xFF0000)
                .setTitle(`📊 Proxy Information`)
                .setDescription(`Details for \`${domain}\``)
                .addFields(
                    { name: "Domain", value: proxy.domain, inline: true },
                    { name: "Target IP", value: proxy.targetIp, inline: true },
                    { name: "Target Port", value: proxy.targetPort.toString(), inline: true },
                    { name: "Status", value: status, inline: true },
                    { name: "Proxy ID", value: proxy.id.toString(), inline: true },
                    { name: "Created", value: new Date(proxy.createdAt).toLocaleDateString('en-US'), inline: true }
                )
                .setTimestamp()

            if (existingProxy) {
                infoEmbed.addFields(
                    { name: "SSL", value: existingProxy.ssl_forced ? "✅ Forced" : ":warning: Not Forced", inline: true },
                    { name: "Websockets", value: existingProxy.allow_websocket_upgrade ? "✅ Enabled" : "❌ Disabled", inline: true },
                    { name: "Cache", value: existingProxy.caching_enabled ? "✅ Enabled" : "❌ Disabled", inline: true }
                )
            }

            await interaction.editReply({ embeds: [infoEmbed] })

        } catch (error) {
            console.error("info-proxy error:", error)
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Unexpected Error")
                .setDescription("An unexpected error occurred while retrieving information.")
                .setTimestamp()

            await interaction.editReply({ embeds: [errorEmbed] })
        }
    }
}
