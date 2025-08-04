# Reverse Proxy Bot

A Discord bot to manage reverse proxies via Nginx Proxy Manager.

## Features

- **Proxy Creation**: Create reverse proxies with automatic SSL certificates
- **Proxy Deletion**: Delete your existing proxies  
- **Proxy Information**: View status and details of your proxies
- **DNS Verification**: Automatic verification that domains point to the reverse proxy server
- **User Management**: Each user can manage their own proxies independently
- **User Install Support**: Works both in servers and as a user-installed app (DMs)

## Commands

### `/create-proxy`
Creates a new reverse proxy.

**Parameters:**
- `domain`: Your domain name (must point to the reverse proxy server)
- `target_ip`: The internal IP address of your service (e.g., 192.168.1.100)
- `target_port`: The port where your service is running (e.g., 3000, 8080)

**Example:**
```
/create-proxy domain:mysite.com target_ip:192.168.1.100 target_port:3000
```

### `/delete-proxy`
Deletes one of your existing proxies.

**Parameters:**
- `domain`: The domain name of the proxy to delete

**Example:**
```
/delete-proxy domain:mysite.com
```

### `/list-proxy`
Displays a list of all your proxies with their status.

**Example:**
```
/list-proxy
```

### `/info-proxy`
Displays detailed information about a specific proxy.

**Parameters:**
- `domain`: The specific domain to get information about

**Example:**
```
/info-proxy domain:mysite.com
```

## Configuration

1. Create a Discord bot on https://discord.com/developers/applications
2. Copy the `config.example.json` file to `config.json`:
   ```bash
   cp config.example.json config.json
   ```
3. Configure the `config.json` file with your settings:

```json
{
    "token": "YOUR_DISCORD_TOKEN",
    "permission": {
        "base": ":x: You don't have the `{perm}` permission to do that !",
        "NOTE": "Add {perm} to say the discord permission name !"
    },
    "nginxPM": {
        "ip": "YOUR_REVERSE_PROXY_SERVER_IP",
        "host": "http://your-nginx-pm.com:81",
        "email": "your-email@example.com", 
        "pass": "your-nginx-pm-password"
    }
}
```

⚠️ **Important**: Never share your `config.json` file as it contains sensitive information!

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `config.json` with your settings
4. Start the bot:
   ```bash
   node index.js
   ```

## Prerequisites

- Node.js (version 16 or higher)
- A configured and accessible Nginx Proxy Manager server
- A Discord bot with appropriate permissions and user install enabled

## User Install Setup

This bot supports both **server installation** and **user installation**:

### Server Installation (Traditional)
- Add the bot to your Discord server
- Use commands in any channel where the bot has permissions
- Permission checks apply based on server roles

### User Installation (New)
- Install the bot directly to your Discord account
- Use commands in DMs with the bot or in any server
- No server permissions required
- Personal proxy management anywhere on Discord

To enable user installs for your bot:
1. Go to your Discord Developer Portal
2. Select your application
3. Go to "Installation" settings
4. Enable "User Install"
5. Add the necessary scopes and permissions

## How it works

### DNS Verification
Before creating a proxy, the bot verifies that the domain points to the reverse proxy server IP (not to the final service IP). If not, the proxy creation is refused.

**Workflow:**
1. User wants to create a proxy for `mysite.com` to `192.168.1.100:3000`
2. Bot checks that `mysite.com` points to the reverse proxy IP (e.g., `45.145.166.68`)
3. If yes → proxy creation that will redirect to `192.168.1.100:3000`
4. If no → refusal with error message

### SSL Certificates
All proxies are automatically configured with:
- Let's Encrypt certificates
- Forced HTTPS redirect
- WebSocket support
- Exploit protection

### Data Storage
Proxy information is stored in `data.json` with a user-organized structure:

```json
{
    "users": {
        "USER_ID_1": {
            "proxies": [
                {
                    "id": 123,
                    "domain": "example.com",
                    "targetIp": "192.168.1.100",
                    "targetPort": 3000,
                    "createdAt": "2025-08-04T10:30:00.000Z"
                }
            ]
        },
        "USER_ID_2": {
            "proxies": [...]
        }
    }
}
```

Each user can only see and manage their own proxies.

## Project Structure

```
├── commands/           # Discord commands
│   ├── create-proxy.js
│   ├── delete-proxy.js
│   ├── list-proxy.js
│   └── info-proxy.js
├── nginxPM/           # Nginx PM modules
│   ├── proxy.js       # Proxy creation
│   ├── deleteProxy.js # Proxy deletion
│   ├── findProxy.js   # Proxy search
│   ├── getDomainIp.js # DNS resolution
│   └── getKey.js      # Authentication
├── config.json        # Configuration
├── data.json          # Proxy data
├── index.js           # Entry point
└── package.json       # Dependencies
```
