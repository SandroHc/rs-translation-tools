const express = require('express');
const router = express.Router();
const fs = require('fs');
const formidable = require('formidable');
const debug = require('debug')('app:route:import');
const { keyv } = require("../utils/keyv");
const { sonicChannelIngest } = require('../utils/sonic');


function getAlertFromStatus(status, message) {
	if (status === 'success')
		return 'success';
	else if (status === 'warning')
		return 'warning';
	else if (status === 'error')
		return 'danger';
	else if (status || message)
		return 'primary';
	else
		return undefined;
}

router.get('/', function(req, res) {
	let status = req.query.status;
	let message = req.query.message;
	let alert = getAlertFromStatus(status, message);

	res.render('dashboard', { title: 'Dashboard', alert, message });
});

router.post('/import', async function(req, res) {
	res.setTimeout(1000 * 60 * 10); // 10 minute timeout

	let pendingData = [];

	await new formidable.IncomingForm().parse(req)
		.on('file', (_, file) => {
			processFile(file, pendingData)
		})
		.on('error', err => {
			console.error('Error receiving files:', err);
			throw err;
		})
		.on('end', async () => {
			try {
				await ingest(pendingData);

				if (!res.headersSent)
					res.redirect('/dashboard?status=success&message=Success importing files!');
			} catch (e) {
				if (!res.headersSent)
					res.redirect('/dashboard?status=error&message=' + e);
			}
		});
})

function processFile(file, list) {
	let filename = file.name.replace(/\.[^/.]+$/, ''); // remove the extension (e.g. 'items.json' -> 'items')
	let category = filename.replace('.clean', '');

	let rawData = fs.readFileSync(file.path);
	let data = JSON.parse(rawData);

	for (let [id, value] of Object.entries(data))
		list.push(createIngestItem(category, id, value, file.name));
}

function createIngestItem(category, id, value, source) {
	return {
		id: normalizeId(id),
		category: category,
		source: source,
		content: [
			{
				lang: 'eng',
				text: normalize(value.en)
			},
			{
				lang: 'deu',
				text: normalize(value.de)
			},
			{
				lang: 'fra',
				text: normalize(value.fr)
			},
			{
				lang: 'por',
				text: normalize(value.pt)
			},
		]
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
	if (text.endsWith('"'))	 text = text.substring(0, text.length-1);
	return text;
}

async function ingest(translations) {
	let timeTaken;
	let start = Date.now();

	// Process into Sonic
	debug(`Starting ingesting ${translations.length * 4} translations into Sonic`);

	let i = 1;
	let file = null;

	for (let translation of translations) {
		for (content of translation.content) {
			if (!content.text) continue;

			const id = translation.category + ':' + translation.id + ':' + content.lang;

			try {
				await sonicChannelIngest.push('translations', 'default', id, content.text, { lang: content.lang });
			} catch (e) {
				throw 'Error ingesting ' + id + ' into Sonic: ' + e
			}
		}

		if (translation.source !== file) {
			debug(`Ingesting ${translation.category}...`)
			file = translation.source;
			i = 1;
		}

		if (++i % 1000 === 0) {
			debug(`Ingesting ${translation.category}... #${translation.id}`)
			file = translation.source;
		}
	}

	await sonicChannelIngest.flushc('translations');

	timeTaken = (Date.now() - start) / 1000;
	debug('Finished ingestion into Sonic. Took ' + timeTaken + ' seconds');


	// Process into SQLite
	debug(`Starting ingesting ${translations.length} translations into SQLite`);
	let keyvPromises = [];
	start = Date.now();

	for (let translation of translations) {
		const id = translation.category + ':' + translation.id
		const value = {
			id: translation.id,
			category: translation.category,
			content: translation.content.map(content => { return { text: content.text, lang: content.lang }})
		}

		keyvPromises.push(keyv.set(id, value));
	}

	try {
		await keyv.clear();
		await Promise.all(keyvPromises);
	} catch (e) {
		throw 'Error ingesting into SQLite: ' + e
	}

	timeTaken = (Date.now() - start) / 1000;
	debug('Finished ingestion into SQLite. Took ' + timeTaken + ' seconds');
}

function ingestIntoSonic(data) {
	return sonicChannelIngest.push('translations', 'default', data.id, data.text, { lang: data.lang });
}

module.exports = router;
