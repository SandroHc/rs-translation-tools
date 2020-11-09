const express = require('express');
const router = express.Router();
const debug = require('debug')('app:route:import');

const fs = require('fs');
const formidable = require('formidable');

const elastic = require('../db/elastic')


function getAlertFromStatus(status, message) {
  if(status === 'success')
    return 'success';
  else if(status === 'warning')
    return 'warning';
  else if(status === 'error')
    return 'danger';
  else if(status || message)
    return 'primary';
  else
    return undefined;
}

router.get('/', function(req, res, next) {
  let status = req.query.status;
  let message = req.query.message;
  let alert = getAlertFromStatus(status, message);

  // elastic.search({
  //   index: 'translations',
  //   size: 0,
  //   body: {
  //     aggs: {
  //       categories: {
  //         terms: {
  //           field: 'category',
  //         },
  //       },
  //     },
  //   }
  // })
  //     .then(result => {
  //       let hits = result.body.hits
  //       const total = hits.total.value;
  //       debug(`Found ${total} results for`);
  //
  //       // res.render('search', { title: text, search: text, results: categories, total });
  //     })
  //     .catch(err => {
  //       debug(`Error searching on Elastic: ${err.name}: ${err.message}`)
  //       debug(err.stack)
  //
  //       // res.locals.error = req.app.get('env') === 'development' ? err : {}; // only show stacktrace in dev
  //       // res.status(500);
  //       // res.render('error');
  //     })
  
  res.render('dashboard', { title: 'Dashboard', alert, message });
});

router.post('/import', async function(req, res, next) {
  res.setTimeout(1000 * 60 * 10); // 10 minute timeout

  let promises = [];

  new formidable.IncomingForm().parse(req)
    .on('file', (_, file) => {
      promises.push(processFile(file)
        .catch(err => {
          throw `Error processing '${file.name}': ${err}`;
        })
      );
    })
    .on('error', err => {
      console.error('Error receiving files:', err);
      throw err;
    })
    .on('end', () => {
      Promise.all(promises)
        .catch(err => {
          console.error(err);
          res.redirect('/dashboard?status=error&message=' + err);
        })
        .then(() => {
          if (res.headersSent)
            return;

          debug('Finished all files');
          res.redirect('/dashboard?status=success&message=Success importing files!');
        })
    })
})

async function processFile(file) {
  let filename = file.name.replace(/\.[^/.]+$/, ''); // remove the extension (e.g. 'items.json' -> 'items')
  let category = filename.replace('.clean', '');

  let rawData = fs.readFileSync(file.path);
  let data = JSON.parse(rawData);

  let translations = [];
  for (let [id, value] of Object.entries(data))
    translations.push(createMongoItem(category, id, value));

  return ingestMongo(file.name, translations)
    .then(() => debug(`Finished '${file.name}'`));
}

function createMongoItem(category, id, value) {
  return {
    id: normalizeId(id),
    category: getCategory(category),
    content: {
      en: normalize(value.en),
      de: normalize(value.de),
      fr: normalize(value.fr),
      pt: normalize(value.pt),
    }
  }
}

function normalizeId(id) {
  if (id.startsWith('#'))
    id = id.substring(1);

  let num = parseInt(id, 10);
  if (isNaN(num))
    throw new Error(`ID '${id}' is not a valid numeric value`);

  return num;
}

function normalize(text) {
  if (!text || (typeof text !== 'string'))
    return '';

  text = text.trim();
  if (text.startsWith('"')) text = text.substring(1);
  if (text.endsWith('"'))   text = text.substring(0, text.length-1);
  return text;
}

function ingestMongo(filename, translations) {
  debug(`Inserting ${translations.length} translations from ${filename}`);

  debug('Creating \'translations\' index')
  elastic.indices.create({
    index: 'translations',
    body: {
      mappings: {
        properties: {
          id: { type: 'integer' },
          category: { type: 'keyword' },
          content: {
            en: { type: 'text' },
            de: { type: 'text' },
            fr: { type: 'text' },
            pt: { type: 'text' },
          }
        }
      }
    }
  }, { ignore: [400] })

  const body = translations.flatMap(doc => [{
    index: {
      _index: 'translations',
      _id: doc.id,
    }
  }, doc])

  debug('Inserting in bulk')
  return elastic.bulk({ refresh: true, body });
}

function getCategory(name) {
  switch (name) {
    case 'cape_requirements':            return 'Cape Requirements';
    case 'clan_titles':                  return 'Titles';
    case 'invention':                    return 'Invention';
    case 'items':                        return 'Items';
    case 'map_labels':                   return 'Map';
    case 'musics':                       return 'Musics';
    case 'npcs':                         return 'NPCs';
    case 'objects':                      return 'Objects';
    case 'quest_names':                  return 'Quests';
    case 'quests':                       return 'Quests';
    case 'slayer_categories':            return 'Slayer';
    case 'spells':                       return 'Spells';
    case 'summoning_familiars':          return 'Summoning';
    case 'summoning_items':              return 'Summoning';
    case 'ui_action_bar':                return 'Action Bar';
    case 'ui_bosses':                    return 'Bosses';
    case 'world_map_places':             return 'Map';
    case 'world_map_player_owned_ports': return 'Map - Player Owned Ports';
    case 'world_map_zones':              return 'Map';
    default:
      console.warn('UNKNOWN CATEGORY: ', name);
      return name;
  }
}

module.exports = router;
