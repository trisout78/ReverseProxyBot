const { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } = require("discord.js")
const { proxyDomain } = require("../nginxPM/proxy")
const { getDomainIP } = require("../nginxPM/getDomainIp")
const { findProxy } = require("../nginxPM/findProxy")
const config = require("../config.json")
const fs = require('fs')

module.exports = class {
    constructor() {
        this.name = "create-proxy"
        this.description = "Create a new reverse proxy for your domain"
        this.integration_types = [0, 1] // Guild and User install
        this.contexts = [0, 1, 2] // Guild, Bot DM, Private Channel
        this.options = [
            { 
                type: ApplicationCommandOptionType["String"], 
                name: "domain", 
                description: "Your domain name (must point to the reverse proxy server)", 
                required: true 
            },
            { 
                type: ApplicationCommandOptionType["String"], 
                name: "target_ip", 
                description: "The internal IP address of your service (e.g., 192.168.1.100)", 
                required: true 
            },
            { 
                type: ApplicationCommandOptionType["Integer"], 
                name: "target_port", 
                description: "The port where your service is running (e.g., 3000, 8080)", 
                required: true,
                min_value: 1,
                max_value: 65535
            }
        ]
        this.permission = PermissionsBitField.Flags.SendMessages
    }

    async execute(interaction) {
        await interaction.deferReply()

        const domain = interaction.options.getString("domain").toLowerCase().trim()
        const targetIp = interaction.options.getString("target_ip").trim()
        const targetPort = interaction.options.getInteger("target_port")
        const userId = interaction.user.id

        try {
            // Validate and clean input
            if (!domain || domain.includes(' ')) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Invalid Domain")
                    .setDescription("Domain name cannot be empty or contain spaces.")
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            if (!targetIp || targetIp.includes(' ')) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Invalid IP Address")
                    .setDescription("IP address cannot be empty or contain spaces.")
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Check if proxy already exists
            const existingProxy = await findProxy(domain)
            if (existingProxy) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Error")
                    .setDescription(`The domain \`${domain}\` is already in use by an existing proxy.`)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Check that the domain points to the reverse proxy IP
            const reverseProxyIp = config.nginxPM.ip
            const domainIp = await getDomainIP(domain)
            
            if (!domainIp) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ DNS Error")
                    .setDescription(`Unable to resolve domain \`${domain}\`. Make sure the domain exists and points to your reverse proxy server.`)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            if (domainIp !== reverseProxyIp) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Incorrect DNS")
                    .setDescription(`The domain \`${domain}\` currently points to \`${domainIp}\` but must point to your reverse proxy server.\n\n**The proxy cannot be created.** Please configure your DNS so that the domain points to \`${reverseProxyIp}\`.`)
                    .addFields(
                        { name: "Current domain IP", value: domainIp, inline: true },
                        { name: "Required reverse proxy IP", value: reverseProxyIp, inline: true }
                    )
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Create the proxy
            const result = await proxyDomain(domain, targetIp, targetPort)
            
            if (result.error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Creation Error")
                    .setDescription(`Unable to create proxy: ${result.message}`)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            // Save proxy information
            let data = {}
            try {
                data = JSON.parse(fs.readFileSync('./data.json', 'utf8'))
            } catch (err) {
                // If file doesn't exist, create empty structure
                data = { users: {} }
            }

            if (!data.users) data.users = {}
            if (!data.users[userId]) data.users[userId] = { proxies: [] }
            if (!data.users[userId].proxies) data.users[userId].proxies = []

            data.users[userId].proxies.push({
                id: result.data.id,
                domain: domain,
                targetIp: targetIp,
                targetPort: targetPort,
                createdAt: new Date().toISOString()
            })

            fs.writeFileSync('./data.json', JSON.stringify(data, null, 4))

            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ Proxy created successfully")
                .setDescription(`The proxy for \`${domain}\` has been created!`)
                .addFields(
                    { name: "Domain", value: domain, inline: true },
                    { name: "Target IP", value: targetIp, inline: true },
                    { name: "Target Port", value: targetPort.toString(), inline: true },
                    { name: "Proxy ID", value: result.data.id.toString(), inline: true },
                    { name: "SSL", value: "Enabled (Let's Encrypt)", inline: true }
                )
                .setTimestamp()

            await interaction.editReply({ embeds: [successEmbed] })

        } catch (error) {
            console.error("create-proxy error:", error)
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Unexpected Error")
                .setDescription("An unexpected error occurred while creating the proxy.")
                .setTimestamp()

            await interaction.editReply({ embeds: [errorEmbed] })
        }
    }
}
