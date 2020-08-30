const express = require('express');
const router = express.Router();
const debug = require('debug')('app:route:search');

const models = require('../db/models')();
const Translation = models.Translation;


router.get('/:text?', function(req, res, next) {
  // Find the paramenter in the URI (/search/{name}) or in the query parameters (/search?text={name})
  let text = req.params.text || req.query.text;

  if (!text) {
    res.redirect('/');
    return;
  }

  debug('Searching for:', text)

  Translation.find(
      {
        $text: {
          $search: text,
          $language: 'english',
        }
      },
      { confidenceScore: { $meta: 'textScore' } },
      { sort: { confidenceScore: { $meta: 'textScore' } }, limit: 500, skip: 0 })
    .lean()
    .then(results => {
      let total = results.length;
      debug(`Found ${total} results for: ${text}`);

      // Group results into categories
      let categories = {};
      results.forEach(o => {
        if (!categories[o.category]) categories[o.category] = [];

        categories[o.category].push({
          score: o.confidenceScore,
          en: o.content.en.value,
          de: o.content.de.value,
          fr: o.content.fr.value,
          pt: o.content.pt.value,
        });
      });
      
      res.render('search', { title: text, search: text, results: categories, total });
    });  
});


module.exports = router;