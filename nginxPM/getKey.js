const axios = require('axios');
const config = require('../config.json')

const getKey = async () => {
    try {
        if (!config.nginxPM.host || !config.nginxPM.email || !config.nginxPM.pass) {
            throw new Error('Nginx PM configuration is incomplete in config.json');
        }

        const res = await axios({
            url: `${config.nginxPM.host}/api/tokens`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                "identity": config.nginxPM.email,
                "secret": config.nginxPM.pass
            }
        });

        if (!res.data.token) {
            throw new Error('No token received from Nginx PM');
        }

        return `Bearer ${res.data.token}`;
    } catch (error) {
        console.error('getKey error:', error.message);
        
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                throw new Error('Invalid Nginx PM credentials');
            } else if (status === 404) {
                throw new Error('Nginx PM API not found - check host configuration');
            }
        }
        
        throw error;
    }
};

module.exports = {
    getKey
};