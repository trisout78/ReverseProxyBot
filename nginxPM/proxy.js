const axios = require('axios');
const { getKey } = require("./getKey")
const config = require('../config.json')

const proxyDomain = async (domain, ip, port) => {
    try {
        // Clean and validate parameters
        domain = domain ? domain.trim() : '';
        ip = ip ? ip.trim() : '';
        
        if (!domain || !ip || !port) {
            return {error: true, message: "Domain, IP and port are required", data: null};
        }

        // Check for spaces in domain and IP
        if (domain.includes(' ')) {
            return {error: true, message: "Domain name cannot contain spaces", data: null};
        }

        if (ip.includes(' ')) {
            return {error: true, message: "IP address cannot contain spaces", data: null};
        }

        // Validate domain format (basic check)
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return {error: true, message: "Invalid domain name format", data: null};
        }

        // Validation de l'IP
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
            return {error: true, message: "Invalid IP address format", data: null};
        }

        // Validation du port
        if (port < 1 || port > 65535) {
            return {error: true, message: "Port must be between 1 and 65535", data: null};
        }

        let {data} = await axios({
            url: `${config.nginxPM.host}/api/nginx/proxy-hosts`,
            method: 'POST',
            headers: {
                'Authorization': await getKey(),
                'Content-Type': 'application/json',
            },
            data: {
                "domain_names": [
                    domain
                ],
                "forward_scheme": "http",
                "forward_host": ip,
                "forward_port": port,
                "access_list_id": "0",
                "certificate_id": "new",
                "meta": {
                    "letsencrypt_email": config.nginxPM.email || "support@trisout.fr",
                    "letsencrypt_agree": true,
                    "dns_challenge": false
                },
                "advanced_config": "",
                "locations": [],
                "block_exploits": true,
                "caching_enabled": false,
                "allow_websocket_upgrade": true,
                "http2_support": false,
                "hsts_enabled": false,
                "hsts_subdomains": false,
                "ssl_forced": true
            }
        });

        return {error: false, message: "Successfully proxied domain.", data: data};
    } catch (err) {
        console.log("proxyDomain: " + err.message)
        
        // Gestion d'erreurs plus spécifique
        if (err.response) {
            const status = err.response.status;
            const message = err.response.data?.message || err.message;
            
            if (status === 400) {
                return {error: true, message: "Bad request: " + message, data: null};
            } else if (status === 401) {
                return {error: true, message: "Authentication failed", data: null};
            } else if (status === 409) {
                return {error: true, message: "Domain already exists", data: null};
            } else {
                return {error: true, message: `HTTP ${status}: ${message}`, data: null};
            }
        }
        
        return {error: true, message: err.message, data: null};
    }
}

module.exports = {
    proxyDomain
}
