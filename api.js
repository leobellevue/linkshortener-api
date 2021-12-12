var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var crypto = require('crypto');
var bunyan = require('bunyan');
const { Pool, Client } = require('pg');

const credentials = {
  user: "ykwlqxldwgocmw",
  host: "ec2-35-169-37-64.compute-1.amazonaws.com",
  database: "d2o40bvr2csv1j",
  password: "99ba7076507f70d215d8ce9796055d79f0a854428a637d0179cbece99f892778",
  port: 5432,
};

var testAPIRouter = require('./routes/testAPI');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/dev', testAPIRouter);

app.post('/', async function(req, res) {
  const client = new Client(credentials);
  await client.connect();
  var shortLink;
  var linkCreated = false;
  while (!linkCreated) {
    shortLink = crypto.randomBytes(4).toString("hex");
    results = await client.query('SELECT * FROM links WHERE short_url = $1', [shortLink]);
    linkCreated = results.rows.length === 0;
  };
  var link = req.body.link;
  link = (link.indexOf('://') === -1) ? 'http://' + link : link;
  var result = await client.query(`INSERT INTO links (url, short_url) VALUES ($1, $2);`,[link, shortLink]);
  await client.end();
  console.log(shortLink);
  res.send({shortLink: "http://shortlinkme-api.herokuapp.com" + shortLink});
});

app.get("/:shortLink", async function(req, res) {
  const client = new Client(credentials);
  await client.connect();
  var results = await client.query('SELECT * FROM links WHERE short_url = $1', [req.params.shortLink]);
  var link = results.rows[0].url;
  res.redirect(link)
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  var log = bunyan.createLogger({name: "linkshortener", streams: [{path: "linkshortener.log", level: "debug"}]});
  log.error(err);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
