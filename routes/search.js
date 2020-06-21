const express = require('express');
const router = express.Router();

const SonicChannelSearch = require("sonic-channel").Search;

const models = require('../db/models')();
const Translation = models.Translation;


router.get('/:text?', function(req, res, next) {
  let text = req.params.text || req.query.text;

  console.log('SEARCH', text)

  if (!text) {
    res.render('search', { title: text, results: [] });
    return;
  }

  
  // TODO: remove dependency 'mongoose-fuzzy-searching'
  Translation.fuzzySearch(text, { category: "clan_titles" })
    .then(results => {
      console.log('RESULTS', results);
      res.render('search', { title: text, results });
    })
  
  /*
  let sonicChannelSearch = new SonicChannelSearch({
    host: process.env.SONIC_HOST,
    port: parseInt(process.env.SONIC_PORT, 10),
    auth: process.env.SONIC_PASS,
  }).connect({
    connected: () => {
      console.info('Sonic Channel succeeded to connect to host (search)');
      sonicChannelSearch.query(COLLECTION, BUCKET_ID, text)
        .then(results => {
          console.info('SONIC RESULTS', results);

          Translation.find({ key: 'items:47553' }).exec()
            .then(results => {
              console.info('MONGO RESULTS', results);
              res.render('search', { title: text, results }); 
            })
        })
        .catch(error => {
          console.error(error);
          throw error;
        })
    },
    retrying: () => console.warn('Trying to reconnect to Sonic Channel (search)...'),
    error: error => {
      console.error('Error connecting to Sonic Channel (search):', error);
      throw error;
    },
  })
  */
});

function doSearch(sonicChannelSearch, text) {
  
}


module.exports = router;