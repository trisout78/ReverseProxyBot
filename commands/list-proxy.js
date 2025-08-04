const { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } = require("discord.js")
const { findProxy } = require("../nginxPM/findProxy")
const fs = require('fs')

module.exports = class {
    constructor() {
        this.name = "list-proxy"
        this.description = "List all your reverse proxies"
        this.integration_types = [0, 1] // Guild and User install
        this.contexts = [0, 1, 2] // Guild, Bot DM, Private Channel
        this.options = []
        this.permission = PermissionsBitField.Flags.SendMessages
    }

    async execute(interaction) {
        await interaction.deferReply()

        const userId = interaction.user.id

        try {
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
                    .setDescription("You don't have any proxies created.\n\nUse `/create-proxy` to create your first proxy!")
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            const userProxies = data.users[userId].proxies

            // List all user proxies
            const listEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle("📋 Your proxies")
                .setDescription(`You have **${userProxies.length}** proxy(s) created`)
                .setTimestamp()

            // Check status of each proxy (limited to first 15 to avoid timeouts)
            const proxiesToCheck = userProxies.slice(0, 15)
            const proxyStatuses = await Promise.all(
                proxiesToCheck.map(async (proxy) => {
                    try {
                        const existingProxy = await findProxy(proxy.domain)
                        return {
                            ...proxy,
                            active: !!existingProxy
                        }
                    } catch {
                        return {
                            ...proxy,
                            active: false
                        }
                    }
                })
            )

            let description = ""
            for (const proxy of proxyStatuses) {
                const status = proxy.active ? "🟢" : "🔴"
                const createdDate = new Date(proxy.createdAt).toLocaleDateString('en-US')
                description += `${status} **${proxy.domain}** → \`${proxy.targetIp}:${proxy.targetPort}\` (${createdDate})\n`
            }

            if (userProxies.length > 15) {
                description += `\n*... and ${userProxies.length - 15} more proxies*`
            }

            listEmbed.setDescription(description || "No proxies found")

            // Add statistics
            const activeCount = proxyStatuses.filter(p => p.active).length
            const inactiveCount = proxyStatuses.filter(p => !p.active).length

            listEmbed.addFields(
                { name: "🟢 Active", value: activeCount.toString(), inline: true },
                { name: "🔴 Inactive", value: inactiveCount.toString(), inline: true },
                { name: "📊 Total", value: userProxies.length.toString(), inline: true }
            )

            // Add note if there are more than 15 proxies
            if (userProxies.length > 15) {
                listEmbed.setFooter({ 
                    text: `Only the first 15 proxies are checked for status. Use /info-proxy for more details on a specific proxy.` 
                })
            }

            await interaction.editReply({ embeds: [listEmbed] })

        } catch (error) {
            console.error("list-proxy error:", error)
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Unexpected Error")
                .setDescription("An unexpected error occurred while retrieving the list.")
                .setTimestamp()

            await interaction.editReply({ embeds: [errorEmbed] })
        }
    }
}
