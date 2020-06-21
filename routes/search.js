const express = require('express');
const router = express.Router();

const SonicChannelSearch = require("sonic-channel").Search;

const COLLECTION = 'translations';
const BUCKET_ID = 'en';

router.get('/:text?', function(req, res, next) {
  let text = req.params.text || req.query.text;

  console.log('SEARCH', text)

  if (!text) {
    doRender([]);
    return;
  }

  let sonicChannelSearch = new SonicChannelSearch({
    host: process.env.SONIC_HOST,
    port: parseInt(process.env.SONIC_PORT, 10),
    auth: process.env.SONIC_PASS,
  }).connect({
    connected: () => {
      console.info('Sonic Channel succeeded to connect to host (search)');
      doSearch(sonicChannelSearch, text);
    },
    retrying: () => console.warn('Trying to reconnect to Sonic Channel (search)...'),
    error: error => {
      console.error('Error connecting to Sonic Channel (search):', error);
      throw error;
    },
  })
});

function doSearch(sonicChannelSearch, text) {
  sonicChannelSearch.query(COLLECTION, BUCKET_ID, text)
    .then(results => {
      console.info('Results', results);
      doRender(results);
    })
    .catch(error => {
      console.error(error);
      throw error;
    })
}

function doRender(results) {
  res.render('search', { title: text, results });
}

module.exports = router;