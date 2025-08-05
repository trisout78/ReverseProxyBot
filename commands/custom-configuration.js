const { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js")
const { updateCustomConfig } = require("../nginxPM/customConfig")
const { findProxy } = require("../nginxPM/findProxy")
const fs = require('fs')

module.exports = class {
    constructor() {
        this.name = "custom-configuration"
        this.description = "Manage custom Nginx configuration for a domain"
        this.integration_types = [0, 1] // Guild and User install
        this.contexts = [0, 1, 2] // Guild, Bot DM, Private Channel
        this.options = [
            { 
                type: ApplicationCommandOptionType["String"], 
                name: "domain", 
                description: "The domain name to manage custom configuration for", 
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

            // Create information embed
            const infoEmbed = new EmbedBuilder()
                .setColor(0xFFAA00)
                .setTitle("⚙️ Custom Nginx Configuration")
                .setDescription(`**Advanced Feature for \`${domain}\`**\n\nCustom Nginx configuration allows you to add advanced directives to your proxy.`)
                .addFields(
                    {
                        name: "🔧 Available Variables",
                        value: "• `$server` - Forward Hostname/IP\n• `$port` - Forward Port\n• `$forward_scheme` - Scheme (http/https)",
                        inline: false
                    },
                    {
                        name: "⚠️ Important Notes",
                        value: "• `add_header` or `set_header` directives won't work in main config\n• For headers, create a custom location `/` block\n• Invalid configuration may break your proxy\n• Use with caution!",
                        inline: false
                    },
                    {
                        name: "📝 Current Configuration",
                        value: existingProxy.advanced_config ? 
                            `\`\`\`nginx\n${existingProxy.advanced_config.substring(0, 500)}${existingProxy.advanced_config.length > 500 ? '...' : ''}\n\`\`\`` : 
                            "*No custom configuration set*",
                        inline: false
                    }
                )
                .setFooter({ text: "Click the button below to edit the configuration" })
                .setTimestamp()

            // Create button to open modal
            const editButton = new ButtonBuilder()
                .setCustomId(`edit_config_${domain}_${userId}`)
                .setLabel("Edit Configuration")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("✏️")

            const clearButton = new ButtonBuilder()
                .setCustomId(`clear_config_${domain}_${userId}`)
                .setLabel("Clear Configuration")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🗑️")

            const row = new ActionRowBuilder()
                .addComponents(editButton, clearButton)

            await interaction.editReply({ embeds: [infoEmbed], components: [row] })

        } catch (error) {
            console.error("custom-configuration error:", error)
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Unexpected Error")
                .setDescription("An unexpected error occurred while retrieving configuration.")
                .setTimestamp()

            await interaction.editReply({ embeds: [errorEmbed] })
        }
    }

    static async handleButtonInteraction(interaction) {
        const customId = interaction.customId
        
        if (customId.startsWith('edit_config_')) {
            const parts = customId.split('_')
            const domain = parts[2]
            const userId = parts[3]
            
            // Check if user matches
            if (interaction.user.id !== userId) {
                return await interaction.reply({ 
                    content: "❌ You can only edit your own proxy configurations.", 
                    ephemeral: true 
                })
            }

            // Get current configuration
            const existingProxy = await findProxy(domain)
            const currentConfig = existingProxy?.advanced_config || ""

            // Create modal
            const modal = new ModalBuilder()
                .setCustomId(`config_modal_${domain}_${userId}`)
                .setTitle(`Custom Config for ${domain}`)

            const configInput = new TextInputBuilder()
                .setCustomId('nginx_config')
                .setLabel('Nginx Configuration')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter your custom Nginx configuration...')
                .setValue(currentConfig)
                .setRequired(false)
                .setMaxLength(4000)

            const row = new ActionRowBuilder().addComponents(configInput)
            modal.addComponents(row)

            await interaction.showModal(modal)
            
        } else if (customId.startsWith('clear_config_')) {
            const parts = customId.split('_')
            const domain = parts[2]
            const userId = parts[3]
            
            // Check if user matches
            if (interaction.user.id !== userId) {
                return await interaction.reply({ 
                    content: "❌ You can only edit your own proxy configurations.", 
                    ephemeral: true 
                })
            }

            await interaction.deferReply({ ephemeral: true })

            // Clear configuration
            const result = await updateCustomConfig(domain, "")

            if (result.error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Failed to clear configuration")
                    .setDescription(result.message)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ Configuration Cleared")
                .setDescription(`Custom configuration has been cleared for \`${domain}\``)
                .setTimestamp()

            await interaction.editReply({ embeds: [successEmbed] })
        }
    }

    static async handleModalSubmit(interaction) {
        const customId = interaction.customId
        
        if (customId.startsWith('config_modal_')) {
            const parts = customId.split('_')
            const domain = parts[2]
            const userId = parts[3]
            
            // Check if user matches
            if (interaction.user.id !== userId) {
                return await interaction.reply({ 
                    content: "❌ You can only edit your own proxy configurations.", 
                    ephemeral: true 
                })
            }

            await interaction.deferReply({ ephemeral: true })

            const customConfig = interaction.fields.getTextInputValue('nginx_config')

            // Update configuration
            const result = await updateCustomConfig(domain, customConfig)

            if (result.error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Failed to update configuration")
                    .setDescription(result.message)
                    .setTimestamp()

                return await interaction.editReply({ embeds: [errorEmbed] })
            }

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ Configuration Updated")
                .setDescription(`Custom configuration has been updated for \`${domain}\``)
                .addFields({
                    name: "📝 New Configuration",
                    value: customConfig ? 
                        `\`\`\`nginx\n${customConfig.substring(0, 500)}${customConfig.length > 500 ? '...' : ''}\n\`\`\`` : 
                        "*Configuration cleared*",
                    inline: false
                })
                .setTimestamp()

            await interaction.editReply({ embeds: [successEmbed] })
        }
    }
}
