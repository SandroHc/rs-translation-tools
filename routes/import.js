const express = require('express');
const router = express.Router();

const fs = require('fs');
const formidable = require('formidable');
const SonicChannelIngest = require('sonic-channel').Ingest;

router.get('/', function(req, res, next) {
  res.render('import');
});

router.post('/send', function(req, res, next) {
  let errors = [];
  let success = [];

  console.warn('SEND')

  let sonicChannelIngest = new SonicChannelIngest({
    host: process.env.SONIC_HOST,
    port: parseInt(process.env.SONIC_PORT, 10),
    auth: process.env.SONIC_PASS,
  }).connect({
    connected: () => {
      console.info('Sonic Channel succeeded to connect to host (ingest)');

      let onError = err => {
        console.error('Error ingesting:', err);
        throw err;
      }

      new formidable.IncomingForm().parse(req)
        .on('file', (name, file) => {
          let filename = file.name.replace(/\.[^/.]+$/, '');

          let rawdata = fs.readFileSync(file.path);
          let data = JSON.parse(rawdata);

          for (let [id, value] of Object.entries(data)) {
            let key = `${filename}:${id.substr(1)}`;

            console.log('Ingesting', key);//, `en=${value.en}\tde=${value.de}\tfr=${value.fr}\tpt=${value.pt}`);
            
            if (value.en) sonicChannelIngest.push('translations', 'en', key, value.en.toString()).catch(onError);
            if (value.de) sonicChannelIngest.push('translations', 'de', key, value.de.toString()).catch(onError);
            if (value.fr) sonicChannelIngest.push('translations', 'fr', key, value.fr.toString()).catch(onError);
            if (value.pt) sonicChannelIngest.push('translations', 'pt', key, value.pt.toString()).catch(onError);
          }

          success.push(file.name);
        })
        .on('error', (err) => {
          console.error('Error receiving files:', err);
          throw err;
        })
        .on('end', () => {
          res.send(`errors: ${errors}<br>sucess: ${success}`);
        })
    },
    retrying : function() {
      console.warn('Trying to reconnect to Sonic Channel (ingest)...');
    },
    error: (error) => {
      console.error('Error connecting to Sonic Channel (ingest):', error);
      throw error;
    },
  });

  
})

module.exports = router;
