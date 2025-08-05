const { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } = require("discord.js")
const { toggleSsl } = require("../nginxPM/toggleSsl")
const { findProxy } = require("../nginxPM/findProxy")
const fs = require('fs')

module.exports = class {
    constructor() {
        this.name = "force-ssl"
        this.description = "Toggle SSL forcing for a domain (enable if disabled, disable if enabled)"
        this.integration_types = [0, 1] // Guild and User install
        this.contexts = [0, 1, 2] // Guild, Bot DM, Private Channel
        this.options = [
            { 
                type: ApplicationCommandOptionType["String"], 
                name: "domain", 
                description: "The domain name to toggle SSL forcing for", 
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

            // Load data to check if user owns this proxy
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

            // Check if proxy exists on Nginx PM
            const existingProxy = await findProxy(domain)
            if (!existingProxy) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Proxy not active")
                    .setDescription(`The proxy for \`${domain}\` is not currently active on the server.`)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Get current SSL state before toggling
            const currentSslState = existingProxy.ssl_forced

            // Toggle SSL
            const result = await toggleSsl(domain)

            if (result.error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Failed to toggle SSL")
                    .setDescription(result.message)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Success response
            const action = result.data.ssl_forced ? "enabled" : "disabled"
            const actionIcon = result.data.ssl_forced ? "🔒" : "🔓"
            const statusText = result.data.ssl_forced ? "✅ SSL Forced" : "⚠️ SSL Not Forced"
            
            const successEmbed = new EmbedBuilder()
                .setColor(result.data.ssl_forced ? 0x00FF00 : 0xFFAA00)
                .setTitle(`${actionIcon} SSL Configuration Updated`)
                .setDescription(`SSL forcing has been **${action}** for \`${domain}\``)
                .addFields(
                    { name: "Domain", value: domain, inline: true },
                    { name: "SSL Status", value: statusText, inline: true },
                    { name: "Previous State", value: currentSslState ? "✅ Forced" : "⚠️ Not Forced", inline: true }
                )
                .setTimestamp()

            await interaction.editReply({ embeds: [successEmbed] })

        } catch (error) {
            console.error("force-ssl error:", error)
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Unexpected Error")
                .setDescription("An unexpected error occurred while toggling SSL.")
                .setTimestamp()

            await interaction.editReply({ embeds: [errorEmbed] })
        }
    }
}
