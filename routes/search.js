const express = require('express');
const router = express.Router();
const debug = require('debug')('app:route:search');

const elastic = require('../db/elastic')


router.get('/:text?', function(req, res, next) {
	// Find the parameter in the URI (/search/{name}) or in the query parameters (/search?text={name})
	let text = req.params.text || req.query.text;

	if (!text) {
		res.redirect('/');
		return;
	}

	debug('Searching for:', text)

	elastic.search({
		index: 'translations',
		body: {
			query: {
				multi_match: {
					query: text,
					fields: [
						'content.en^1.5',
						'content.de',
						'content.fr',
						'content.pt'
					],
					fuzziness: 'AUTO',
					prefix_length: 2
				},
			},
			highlight: {
				fields: {
					'content.en': { type: 'unified' },
					'content.de': { type: 'unified' },
					'content.fr': { type: 'unified' },
					'content.pt': { type: 'unified' },
				}
			}
		}
	})
		.then(result => {
			let hits = result.body.hits
			const total = hits.total.value;
			debug(`Found ${total} results for: ${text}`);

			// Group results into categories
			let categories = {};

			hits.hits.forEach(o => {
				if (!categories[o._source.category]) categories[o._source.category] = [];

				let getTextOrHighlight = (o, key, text) => o.highlight && o.highlight[key] ? o.highlight[key][0] : text

				categories[o._source.category].push({
					score: o._score,
					en: {
						text: o._source.content.en,
						highlight: getTextOrHighlight(o, 'content.en', o._source.content.en),
					},
					de: {
						text: o._source.content.de,
						highlight: getTextOrHighlight(o, 'content.de', o._source.content.de),
					},
					fr: {
						text: o._source.content.fr,
						highlight: getTextOrHighlight(o, 'content.fr', o._source.content.fr),
					},
					pt: {
						text: o._source.content.pt,
						highlight: getTextOrHighlight(o, 'content.pt', o._source.content.pt),
					},
				});
			});

			res.render('search', { title: text, search: text, results: categories, total });
		})
		.catch(err => {
			debug(`Error searching for '${text}' on Elastic: ${err.name}: ${err.message}`)
			debug(err.stack)

			res.locals.error = req.app.get('env') === 'development' ? err : {}; // only show stacktrace in dev
			res.status(500);
			res.render('error');
		})
});


module.exports = router;