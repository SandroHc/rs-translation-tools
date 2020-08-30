const express = require('express');
const router = express.Router();
const debug = require('debug')('app:route:index');


router.get('/', function(req, res, next) {
  res.render('index');
});

module.exports = router;