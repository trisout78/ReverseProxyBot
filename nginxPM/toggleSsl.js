const axios = require('axios');
const { getKey } = require("./getKey")
const { findProxy } = require("./findProxy")
const config = require('../config.json')

const toggleSsl = async (domain) => {
    try {
        // Clean and validate parameters
        domain = domain ? domain.trim().toLowerCase() : '';
        
        if (!domain) {
            return {error: true, message: "Domain is required", data: null};
        }

        // Find existing proxy
        const existingProxy = await findProxy(domain);
        if (!existingProxy) {
            return {error: true, message: "Proxy not found", data: null};
        }

        // Toggle SSL forced state
        const newSslState = !existingProxy.ssl_forced;

        // Update the proxy with new SSL state - only send necessary fields
        let {data} = await axios({
            url: `${config.nginxPM.host}/api/nginx/proxy-hosts/${existingProxy.id}`,
            method: 'PUT',
            headers: {
                'Authorization': await getKey(),
                'Content-Type': 'application/json',
            },
            data: {
                "domain_names": existingProxy.domain_names,
                "forward_scheme": existingProxy.forward_scheme,
                "forward_host": existingProxy.forward_host,
                "forward_port": existingProxy.forward_port,
                "access_list_id": existingProxy.access_list_id,
                "certificate_id": existingProxy.certificate_id,
                "meta": existingProxy.meta,
                "advanced_config": existingProxy.advanced_config || "",
                "locations": existingProxy.locations || [],
                "block_exploits": existingProxy.block_exploits,
                "caching_enabled": existingProxy.caching_enabled,
                "allow_websocket_upgrade": existingProxy.allow_websocket_upgrade,
                "http2_support": existingProxy.http2_support,
                "hsts_enabled": existingProxy.hsts_enabled,
                "hsts_subdomains": existingProxy.hsts_subdomains,
                "ssl_forced": newSslState
            }
        });

        const action = newSslState ? "enabled" : "disabled";
        return {
            error: false, 
            message: `SSL forcing ${action} for domain ${domain}`, 
            data: {
                domain: domain,
                ssl_forced: newSslState,
                action: action
            }
        };
    } catch (err) {
        console.log("toggleSsl: " + err.message)
        
        // Gestion d'erreurs plus spécifique
        if (err.response) {
            const status = err.response.status;
            const message = err.response.data?.message || err.message;
            
            if (status === 400) {
                return {error: true, message: "Bad request: " + message, data: null};
            } else if (status === 401) {
                return {error: true, message: "Authentication failed", data: null};
            } else if (status === 404) {
                return {error: true, message: "Proxy not found", data: null};
            } else {
                return {error: true, message: `HTTP ${status}: ${message}`, data: null};
            }
        }
        
        return {error: true, message: err.message, data: null};
    }
}

module.exports = {
    toggleSsl
}
