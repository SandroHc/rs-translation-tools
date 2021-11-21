const { Ingest, Search } = require('sonic-channel');
const debug = require('debug')('app:sonic');
const config = require('../config');

let options = {
	host: config.sonic.host,
	port: config.sonic.port,
	auth: config.sonic.password
};

const sonicChannelSearch = new Search(options).connect({
	connected: () => debug('Connected to Sonic (search)'),
	disconnected: () => debug('Disconnected from Sonic (search)'),
	timeout: () => debug('Timeout on Sonic (search)'),
	retrying: () => debug('Trying to reconnect to Sonic (search)...'),
	error: error => debug('Failed to connect to Sonic (search)', error),
});

const sonicChannelIngest = new Ingest(options).connect({
	connected: () => debug('Connected to Sonic (ingest)'),
	disconnected: () => debug('Disconnected from Sonic (ingest)'),
	timeout: () => debug('Timeout on Sonic (ingest)'),
	retrying: () => debug('Trying to reconnect to Sonic (ingest)...'),
	error: error => debug('Failed to connect to Sonic (ingest)', error),
});

module.exports = {
	sonicChannelSearch,
	sonicChannelIngest
};