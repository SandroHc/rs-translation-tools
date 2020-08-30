const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const sassMiddleware = require('node-sass-middleware');
const createError = require('http-errors');
const basicAuth = require('express-basic-auth');

const indexRouter = require('./routes/index');
const searchRouter = require('./routes/search');
const importRouter = require('./routes/import');

const app = express();
const config = require('./config');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  includePaths: [path.join(__dirname), 'node_modules'],
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

const middleware = {

  globalLocals: function (req, res, next) {
    res.locals.config = config;
    next();
  },

  notFound: function (req, res, next) {
    // catch 404 and forward to error handler
    next(createError(404));
  },

  errorHandler: function (err, req, res, next) {
    if (res.headersSent)
      return next(err);

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  },

};

let authUser = {};
authUser[config.auth.user] = config.auth.password;


app.use(middleware.globalLocals);
app.use(middleware.errorHandler);

app.use('/', indexRouter);
app.use('/search', searchRouter);
app.use('/import', basicAuth({ challenge: true, users: authUser }), importRouter);
app.use(middleware.notFound);

module.exports = app;
