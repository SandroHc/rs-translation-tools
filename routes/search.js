const express = require('express');
const router = express.Router();

const models = require('../db/models')();
const Translation = models.Translation;


router.get('/:text?', function(req, res, next) {
  let text = req.params.text || req.query.text;

  console.log('SEARCH', text)

  if (!text) {
    res.render('search', { title: text, results: [] });
    return;
  }

  Translation.find(
      { $text: { $search: text } },
      { confidenceScore: { $meta: 'textScore' } },
      { sort: { confidenceScore: { $meta: 'textScore' } }, limit: 1000, skip: 0 })
    .then(results => {
      let total = results.length;
      console.log(`Found ${total} results for: ${text}`);

      let categories = {};
      results.forEach(o => {
        if (!categories[o.category]) categories[o.category] = [];

        categories[o.category].push({
          score: o._doc.confidenceScore,
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