const mongoose = require('mongoose');
const fs = require('fs');
const debug = require('debug')('app:middleware:registerModels');

let models = [];
let conns = [];
let path = __dirname + '/../schemas';

const TENANT = 'rstranslations';

/** 
 * https://stackoverflow.com/a/29663284/3220305
 * How to use:
 * 
 *  var models = require('path to your Model factory');
 *  // later on inside a route
 *  var models = models();
 *  models.Translation.find(...);
 */
function factory() {
    // if the connection is cached on the array, reuse it
    if (conns[TENANT]) {
        debug(`Reusing connection to ${TENANT}...`);
    } else {
        debug(`Creating new connection to ${TENANT}...`);
        conns[TENANT] = mongoose.createConnection(getJdbcString(), { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
    }

    if(models[TENANT]) {
        debug('Reusing models');
    } else {
        debug('Registering models');
        
        let instanceModels = [];
        let schemas = fs.readdirSync(path);
        schemas.forEach(schema => {
            let model = schema.split('.').shift();
            instanceModels[model] = conns[TENANT].model(model, require([path, schema].join('/')));
        });
        models[TENANT] = instanceModels;
    }

    return models[TENANT];
}

function getJdbcString() {
    let user = process.env.MONGO_USER;
    let pass = process.env.MONGO_PASS;
    let host = process.env.MONGO_HOST;
    let port = process.env.MONGO_PORT;
    let timeout = 1000 * 60 * 10; // 10 minute timeout
    return `mongodb://${user}:${pass}@${host}:${port}/${TENANT}?keepAlive=true&poolSize=30&socketTimeoutMS=${timeout}&connectTimeoutMS=${timeout}`;
}

module.exports = factory;