const Keyv = require('keyv');
const debug = require('debug')('app:keyv');
const config = require('../config');

const keyv = new Keyv(config.keyv.database);
debug('Started Keyv with database:', config.keyv.database)

module.exports = {
	keyv
};