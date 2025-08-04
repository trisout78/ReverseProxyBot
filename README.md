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