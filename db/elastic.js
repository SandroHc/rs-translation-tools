const config = require('../config');
const { Client } = require('@elastic/elasticsearch')


let conf = {
    node: `http://${config.elastic.host}:${config.elastic.port}`,
    maxRetries: 3,
    requestTimeout: 60000,
};

if (config.elastic.user) {
    conf['auth'] = {
        username: config.elastic.user,
        password: config.elastic.password,
    }
}

const client = new Client(conf)


module.exports = client;