const express = require('express');
const router = express.Router();
const debug = require('debug')('app:route:import');
const { sonicChannelIngest } = require('../utils/sonic');

const fs = require('fs');
const formidable = require('formidable');
const { keyv } = require("../utils/keyv");


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

	await keyv.clear()

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
		translations.push(createIngestItem(category, id, value));

	return ingest(file.name, translations).then(() => debug(`Finished '${file.name}'`));
}

function createIngestItem(category, id, value) {
	let idNormalized = normalizeId(id);
	return {
		id: idNormalized,
		category: category,
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

function ingest(filename, translations) {
	debug(`Inserting ${translations.length} translations from ${filename}`);

	let promises = []

	// Process into Keyv
	for (let translation of translations) {
		const id = translation.category + ':' + translation.id
		const value = {
			id: translation.id,
			category: translation.category,
			content: translation.content.map(content => { return { text: content.text, lang: content.lang }})
		}

		promises.push(keyv.set(id, value));
	}

	// Process into Sonic
	for (let translation of translations) {
		for (content of translation.content) {
			if (!content.text)
				continue;

			const id = translation.category + ':' + translation.id + ':' + content.lang;
			// const options = { lang: content.lang };
			const options = {};
			promises.push(sonicChannelIngest.push('translations', 'default', id, content.text, options));
		}
	}

	return Promise.all(promises)
		.then(() => sonicChannelIngest.flushc('translations'))
}

module.exports = router;
