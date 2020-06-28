const express = require('express');
const router = express.Router();

const fs = require('fs');
const formidable = require('formidable');

const models = require('../db/models')();
const Translation = models.Translation;


router.get('/', function(req, res, next) {
  res.render('import', { title: 'Importer' });
});

router.post('/send', async function(req, res, next) {
  res.setTimeout(1000 * 60 * 10); // 10 minute timeout

  console.info('Cleaning DB')
  await Translation.deleteMany({});
  
  let promises = [];

  new formidable.IncomingForm().parse(req)
    .on('file', (_, file) => {
      promises.push(processFile(file)
        .catch(err => {
          console.error(`Error processing file '${file.name}': ${err}`);
          next(err);
        })
      );
    })
    .on('error', err => {
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
})

async function processFile(file) {
  let filename = file.name.replace(/\.[^/.]+$/, ''); // remove the extension (e.g. 'items.json' -> 'items')
  let category = filename;

  let rawdata = fs.readFileSync(file.path);
  let data;
  try {
    data = JSON.parse(rawdata);
  } catch(e) {
    return Promise.reject(`File '${file.name}' had invalid JSON data: ${e}`);
  }

  let translations = [];

  for (let [id, value] of Object.entries(data)) {
    translations.push(createMongoItem(category, id, value));
  }

  return ingestMongo(file.name, translations)
    .then(() => console.log(`Finished '${file.name}'`));
}

function getKey(category, id) {
  return `${category}:${id}`;
}

function createMongoItem(category, id, value) {
  id = normalizeId(id);

  return {
    key: getKey(category, id),
    category: getCategory(category),
    id,
    content: {
      en: {
        value: normalize(value.en),
        language: 'english',
      },
      de: {
        value: normalize(value.de),
        language: 'german',
      },
      fr: {
        value: normalize(value.fr),
        language: 'french',
      },
      pt: {
        value: normalize(value.pt),
        language: 'portuguese',
      },
    }
  }
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

function normalize(text) {
  if (!text || (typeof text !== 'string'))
    return '';

  text = text.trim();
  if (text.startsWith('"')) text = text.substring(1);
  if (text.endsWith('"'))   text = text.substring(0, text.length-1);
  return text;
}

function ingestMongo(filename, translations) {
  console.log(`Inserting ${translations.length} translations from ${filename}`);

  return Translation.insertMany(translations, { ordered: false })
    .catch(e => {
      console.warn(`Error insering into ${filename}. Probably a duplicate.`)
//      console.trace(e);
    });
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
      break;
  }
}

module.exports = router;
