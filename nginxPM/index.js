const { getKey } = require('./getKey')
const { getDomainIP } = require('./getDomainIp')
const { proxyDomain } = require('./proxy')
const { findProxy } = require('./findProxy')
const { deleteProxy } = require('./deleteProxy')
const { toggleSsl } = require('./toggleSsl')

module.exports = {
    getKey,
    getDomainIP,
    proxyDomain,
    findProxy,
    deleteProxy,
    toggleSsl
}