var express = require('express');
var util = require('./lib/utility');
var bcrypt = require('bcrypt-nodejs');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var favicon = require('serve-favicon');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();
app.use(favicon(__dirname + '/views/favicon.ico'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.use(cookieParser('shhhh, very secret'));
app.use(session());

app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(__dirname + '/public'));


app.get('/', util.checkUser, function(req, res) {
  res.render('index');
});

app.get('/create', util.checkUser, function(req, res) {
  res.render('index');
});

app.get('/links', util.checkUser, function(req, res) {
  db.knex('users').where({username: req.session.user}).select('id').then(function(id){
    Links.reset().query(function(qb) {qb.where('userID', '=',id[0].id); })
      .fetch().then(function(links) {
        res.send(200, links.models);
      });
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }
  db.knex('users').where({username: req.session.user}).select('id').then(function(id){
    new Link({
      url: uri,
      userID: id[0].id
    }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }
          Links.create({
            url: uri,
            userID: id[0].id,
            title: title,
            baseUrl: req.headers.origin
          }).then(function(newLink) {
            res.send(200, newLink);
          });
        });
      }
    });
  });
});


/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  db.knex('users').where({username: username}).select('password')
    .then(function(rows){
      if(rows.length < 1){return res.redirect('signup');}
      bcrypt.compare(password, rows[0].password, function(err, result) {
        if(result) {
          req.session.regenerate(function() {
            req.session.user = username;
            res.redirect('/');
          });
        } else {
          res.redirect('login');
        }
      });
    });
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (!util.isValidUsername(username)) {
    console.log('Not a valid username: ', username);
    return res.send(404);
  }

  new User({username: username})
  .fetch().then(function(found) {
    if (found) {
      console.log('user exists, redirecting');
      return res.redirect('login');
    } else {
      bcrypt.hash(req.body.password, null, null, function (err, hash) {
        Users.create({
          username: username,
          password: hash
        })
        .then(function(user) {
          console.log('created user:', user);
          return res.redirect('login');
        });
      });
    }
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('login');
  });
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  db.knex('users').where({username: req.session.user}).select('id').then(function(id){
    if(id.length < 1){return res.send(404);}
    new Link({
      code: req.params[0],
      userID: id[0].id
    }).fetch().then(function(link) {
      if (!link) {
        res.redirect('/');
      } else {
        var click = new Click({
          linkId: link.get('id')
        });

        click.save().then(function() {
          link.set('visits', link.get('visits') + 1);
          link.save().then(function() {
            return res.redirect(link.get('url'));
          });
        });
      }
    });
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
