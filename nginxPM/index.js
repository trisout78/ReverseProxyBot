const { getKey } = require('./getKey')
const { getDomainIP } = require('./getDomainIp')
const { proxyDomain } = require('./proxy')
const { findProxy } = require('./findProxy')
const { deleteProxy } = require('./deleteProxy')
const { toggleSsl } = require('./toggleSsl')
const { updateCustomConfig } = require('./customConfig')

module.exports = {
    getKey,
    getDomainIP,
    proxyDomain,
    findProxy,
    deleteProxy,
    toggleSsl,
    updateCustomConfig
}