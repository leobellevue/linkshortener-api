var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var crypto = require('crypto');
var bunyan = require('bunyan');
const { Client } = require('pg');

const credentials = {
  connectionString: proccess.env.DATABASE_URL,
};

var testAPIRouter = require('./routes/testAPI');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// setup the logger
app.use(logger('combined', { stream: accessLogStream }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/dev', testAPIRouter);
app.options("*", function(req, res, next){
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.send(200);
});

app.post('/', async function(req, res) {
  const client = new Client(credentials);
  await client.connect();
  var shortLink;
  var linkCreated = false;
  var link = req.body.link
  const isValidUrl = (url) => {
    try {
      new URL(url);
    } catch (e) {
      console.error(e);
      return false;
    };
    return true;
  };

  if (isValidUrl(link)) {
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

    res.set('Access-Control-Allow-Origin', '*');

    res.send({shortLink: "http://shortlinkme-api.herokuapp.com" + shortLink});
  } else {
    res.set('Access-Control-Allow-Origin', '*');
    res.send({error: "Invalid link, please check spelling and try again."});
    console.log("Link invalid, not added to database");
  };
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
