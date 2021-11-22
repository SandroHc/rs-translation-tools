const express = require('express');
const router = express.Router();
const debug = require('debug')('app:route:search');
const { sonicChannelSearch } = require('../utils/sonic');
const { keyv } = require("../utils/keyv");


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

function getHighlight(text, searchTerm) {
	let textClean = text ? text.toLowerCase() : '';
	let searchClean = searchTerm ? searchTerm.toLowerCase() : '';

	let i = textClean.indexOf(searchClean);
	if (i !== -1) {
		let pre   = text.substring(0, i)
		let match = text.substring(i, i + searchClean.length);
		let pos   = text.substring(i + searchClean.length);

		return pre + '<em>' + match + '</em>' + pos
	} else {
		return text
	}
}

function discardLang(str) {
	const i = str.lastIndexOf(':');
	if (i !== -1) {
		return str.substring(0, i);
	} else {
		return str;
	}
}

router.get('/:text?', function(req, res) {
	// Find the parameter in the URI (/search/{name}) or in the query parameters (/search?text={name})
	let searchTerm = req.params.text || req.query.text;

	if (!searchTerm) {
		res.redirect('/');
		return;
	}

	debug('Searching for:', searchTerm)

	sonicChannelSearch.query('translations', 'default', searchTerm)
		.then(results => {
			// Convert results to their respective keys
			const keys = new Set();
			results.map(discardLang).forEach(r => keys.add(r));
			return keys.values();
		})
		.then(keys => {
			// Convert keys to the values
			let results = [];

			for (let key of keys)
				results.push(keyv.get(key));

			return Promise.all(results)
		})
		.then(results => {
			debug(`Found ${results.length} results for: ${searchTerm}`);

			// Group results into categories
			let categories = {};

			for (let result of results) {
				if (!result) {
					debug(`Sonic returned a key that does not exist on SQLite. Consider reindexing the databases.`)
					continue;
				}

				const resp = {}

				for (const content of result.content) {
					resp[content.lang] = {
						text: content.text,
						highlight: getHighlight(content.text, searchTerm),
					}
				}

				// Fill default languages
				if (!resp.eng) resp.eng = { text: '', highlight: '' }
				if (!resp.deu) resp.deu = { text: '', highlight: '' }
				if (!resp.fra) resp.fra = { text: '', highlight: '' }
				if (!resp.por) resp.por = { text: '', highlight: '' }

				// Add result to list
				let category = getCategory(result.category)
				if (!categories[category]) categories[category] = [];
				categories[category].push(resp);
			}

			res.render('search', {
				title: searchTerm,
				search: searchTerm,
				results: categories,
				total: results.length
			});
		})
		.catch(err => {
			debug(`Error searching for '${searchTerm}': ${err.name}: ${err.message}`)
			debug(err.stack)

			res.locals.error = req.app.get('env') === 'development' ? err : {}; // only show stacktrace in dev
			res.status(500);
			res.render('error');
		});
});


module.exports = router;