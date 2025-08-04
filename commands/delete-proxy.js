const { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } = require("discord.js")
const { deleteProxy } = require("../nginxPM/deleteProxy")
const { findProxy } = require("../nginxPM/findProxy")
const fs = require('fs')

module.exports = class {
    constructor() {
        this.name = "delete-proxy"
        this.description = "Delete one of your reverse proxies"
        this.integration_types = [0, 1] // Guild and User install
        this.contexts = [0, 1, 2] // Guild, Bot DM, Private Channel
        this.options = [
            { 
                type: ApplicationCommandOptionType["String"], 
                name: "domain", 
                description: "The domain name of the proxy to delete", 
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
            
            if (!data.users || !data.users[userId] || !data.users[userId].proxies) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ No proxies found")
                    .setDescription("You don't have any proxies created.")
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Find proxy in local data
            const userProxies = data.users[userId].proxies
            const proxyIndex = userProxies.findIndex(proxy => proxy.domain === domain)
            
            if (proxyIndex === -1) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Proxy not found")
                    .setDescription(`You don't have a proxy for the domain \`${domain}\`.`)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            const proxyToDelete = userProxies[proxyIndex]

            // Check that proxy still exists on Nginx PM
            const existingProxy = await findProxy(domain)
            if (!existingProxy) {
                // Remove from local data even if not found on server
                data.users[userId].proxies.splice(proxyIndex, 1)
                if (data.users[userId].proxies.length === 0) {
                    delete data.users[userId]
                }
                fs.writeFileSync('./data.json', JSON.stringify(data, null, 4))

                const warningEmbed = new EmbedBuilder()
                    .setColor(0xFFAA00)
                    .setTitle("⚠️ Proxy already deleted")
                    .setDescription(`The proxy for \`${domain}\` no longer exists on the server. It has been removed from your list.`)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [warningEmbed] })
            }

            // Delete proxy via API
            const result = await deleteProxy(existingProxy.id)
            
            if (!result) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Deletion Error")
                    .setDescription("Unable to delete the proxy. Please try again.")
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Remove from local data
            data.users[userId].proxies.splice(proxyIndex, 1)
            if (data.users[userId].proxies.length === 0) {
                delete data.users[userId]
            }
            fs.writeFileSync('./data.json', JSON.stringify(data, null, 4))

            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ Proxy deleted")
                .setDescription(`The proxy for \`${domain}\` has been successfully deleted.`)
                .addFields(
                    { name: "Domain", value: domain, inline: true },
                    { name: "Target IP", value: proxyToDelete.targetIp, inline: true },
                    { name: "Target Port", value: proxyToDelete.targetPort.toString(), inline: true }
                )
                .setTimestamp()

            await interaction.editReply({ embeds: [successEmbed] })

        } catch (error) {
            console.error("delete-proxy error:", error)
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Unexpected Error")
                .setDescription("An unexpected error occurred while deleting the proxy.")
                .setTimestamp()

            await interaction.editReply({ embeds: [errorEmbed] })
        }
    }
}
