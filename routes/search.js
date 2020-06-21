const express = require('express');
const router = express.Router();

const SonicChannelSearch = require("sonic-channel").Search;


router.get('/:text?', function(req, res, next) {
  let text = req.params.text || req.query.text;

  console.log('SEARCH', text)

  if (!text) {
    res.render('search', { search: text, results: [] });
    return;
  }

  let sonicChannelSearch = new SonicChannelSearch({
    host: process.env.SONIC_HOST,
    port: parseInt(process.env.SONIC_PORT, 10),
    auth: process.env.SONIC_PASS,
  }).connect({
    connected : function() {
      console.info('Sonic Channel succeeded to connect to host (search)');

      sonicChannelSearch.query('translations', 'en', text)
        .then(function(results) {
          console.info('Results', results);

          res.render('search', { search: text, results });
        })
        .catch(function(error) {
          console.warn('Error', error);
        })
    },
    retrying : function() {
      console.warn('Trying to reconnect to Sonic Channel (search)...');
    },
    error: (error) => {
      console.error('Error connecting to Sonic Channel (search):', error);
      throw error;
    },
  })
});

module.exports = router;