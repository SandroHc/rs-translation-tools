const express = require('express');
const router = express.Router();

const fs = require('fs');
const formidable = require('formidable');
const SonicChannelIngest = require('sonic-channel').Ingest;

const models = require('../db/models')();
const Translation = models.Translation;

const COLLECTION = 'translations';

const MAX_SIMULTANEOUS_REQUESTS_SONIC = 1;


router.get('/', function(req, res, next) {
  res.render('import', { title: 'Importer' });
});

router.post('/send', function(req, res, next) {
  res.setTimeout(1000 * 60 * 10); // 10 minute timeout

  console.info('SEND');

  // remove all documents from the MongoDB collection
  //Translation.remove({}).then(() => { // TODO
  Translation.deleteMany({}).then(() => {
    let sonicChannelIngest = new SonicChannelIngest({
      host: process.env.SONIC_HOST,
      port: parseInt(process.env.SONIC_PORT, 10),
      auth: process.env.SONIC_PASS,
    }).connect({
      connected: () => {
        console.info('Sonic Channel succeeded to connect to host (ingest)');

        let promises = [];

        new formidable.IncomingForm().parse(req)
          .on('file', (_, file) => {
            promises.push(processFile(file, sonicChannelIngest)
              .catch(err => {
                console.error(`Error processing file '${file.name}': ${err}`);
                next(err);
              })
            );
          })
          .on('error', (err) => {
            console.error('Error receiving files:', err);
            throw err;
          })
          .on('end', () => {
            Promise.all(promises)
              .then(() => {
                console.log('Finished all files');
                res.send(`done`);
              })
          })
      },
      retrying: () => console.warn('Trying to reconnect to Sonic Channel (ingest)...'),
      error: (error) => {
        console.error('Error connecting to Sonic Channel (ingest):', error);
        throw error;
      },
    })
  })
})

function processFile(file, sonicChannelIngest) {
  let filename = file.name.replace(/\.[^/.]+$/, ''); // remove the extension (e.g. 'items.json' -> 'items')
  let category = filename;

  let rawdata = fs.readFileSync(file.path);
  let data = JSON.parse(rawdata);
  if (!data)
    return Promise.reject(`File '${file.name}' had invalid JSON data`);

  let promisesSonic = [];
  let instancesMongo = [];

  for (let [id, value] of Object.entries(data)) {
    id = normalizeId(id);

    promisesSonic.push(() => ingestSonic(sonicChannelIngest, category, id, value));
    instancesMongo.push(createMongoItem(category, id, value));
  }

  return Promise.all([
//    throttleActions(promisesSonic, MAX_SIMULTANEOUS_REQUESTS_SONIC).then(() => console.log(`Finished '${file.name}' Sonic`)),
    ingestMongo(file.name, instancesMongo).then(() => console.log(`Finished '${filename}' Mongo`))
  ])
    .then(() => console.log(`Finished '${file.name}'`));
}

function normalizeId(id) {
  if (id.startsWith('#'))
    id = id.substring(1);

  let num = parseInt(id, 10);

  if (isNaN(num)) {
    throw new Error(`ID '${id}' is not a valid numeric value`);
  }

  return num;
}

function getKey(category, id) {
  return `${category}:${id}`;
}

function createMongoItem(category, id, value) {
  return {
    key: getKey(category, id),
    category,
    id,
    content: {
      en: value.en,
      de: value.de,
      fr: value.fr,
      pt: value.pt,
    }
  }
}

function ingestMongo(filename, translations) {
  console.log(`Inserting ${translations.length} translations from ${filename} into Mongo`);

  return Translation.insertMany(translations);
  /*return Translation.bulkWrite(
    translations.map(translation => ({
      updateOne: {
        filter: { key: translation.key },
        update: { $set: translation },
        upsert: true
      }
    }))
  )*/
}

function ingestSonic(sonicChannelIngest, category, id, value) {
  let key = getKey(category, id);

  return Promise.all([
    ingestSonicItem(sonicChannelIngest, 'en', key, value.en),
    ingestSonicItem(sonicChannelIngest, 'de', key, value.de),
    ingestSonicItem(sonicChannelIngest, 'fr', key, value.fr),
    ingestSonicItem(sonicChannelIngest, 'pt', key, value.pt)
  ])
//    .then(() => console.log(`Ingested '${key}' into Sonic`));
}

function ingestSonicItem(sonicChannelIngest, bucket, key, value) {
  if (!value)
    return Promise.resolve();

  return sonicChannelIngest
    .push(COLLECTION, bucket, key, value.toString())
    .catch(err => {
      throw new Error(`Unexpected error ingesting '${bucket}@${key}' into Sonic: ${err}`);
    })
}


/**
 * https://stackoverflow.com/a/38386447/3220305
 * 
 * Performs a list of callable actions (promise factories) so that only a limited
 * number of promises are pending at any given time.
 *
 * @param listOfCallableActions An array of callable functions, which should
 *     return promises.
 * @param limit The maximum number of promises to have pending at once.
 * @returns A Promise that resolves to the full list of values when everything is done.
 */
function throttleActions(listOfCallableActions, limit) {
  // We'll need to store which is the next promise in the list.
  let i = 0;
  let resultArray = new Array(listOfCallableActions.length);

  // Now define what happens when any of the actions completes. Javascript is
  // (mostly) single-threaded, so only one completion handler will call at a
  // given time. Because we return doNextAction, the Promise chain continues as
  // long as there's an action left in the list.
  function doNextAction() {
    if (i < listOfCallableActions.length) {
      // Save the current value of i, so we can put the result in the right place
      let actionIndex = i++;
      let nextAction = listOfCallableActions[actionIndex];
      return Promise.resolve(nextAction())
          .then(result => {  // Save results to the correct array index.
             resultArray[actionIndex] = result;
             return;
          }).then(doNextAction);
    }
  }

  // Now start up the original <limit> number of promises.
  // i advances in calls to doNextAction.
  let listOfPromises = [];
  while (i < limit && i < listOfCallableActions.length) {
    listOfPromises.push(doNextAction());
  }
  return Promise.all(listOfPromises).then(() => resultArray);
}

module.exports = router;
