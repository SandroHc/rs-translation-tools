const express = require('express');
const router = express.Router();
const debug = require('debug')('app:route:about');


router.get('/', function(req, res, next) {
	res.render('about');
});

module.exports = router;