const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const Auth = require('./middleware/auth');
const models = require('./models');
const db = require('./db');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
  (req, res) => {
    session = req.session;
    // TODO if session.userid exist send the user to login page
    // else sen user t
    res.render('index', { root: __dirname });
  });

app.get('/create',
  (req, res) => {
    res.render('index');
  });


app.get('/links',
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/login',
  (req, res, next) => {
    var username = req.body.username;
    var password = req.body.password;
    var queryScript = `SELECT password, salt FROM users WHERE username = "${username}";`;
    // console.log('username is ');
    // console.log(password);

    return db.queryAsync(queryScript)
      .then((data) => {
        data = data[0][0];
        var hashedPassword = data.password;
        var salt = data.salt;
        if (!models.Users.compare(password, hashedPassword, salt)) {
          res.redirect('/login');
          return res.send('Invalid username or password');
        }
      })
      .then(() =>{ res.redirect('/'); })
      .catch(err => {
        res.redirect('/login');
        res.send('could not log in');
      });

  });

app.post('/signup',
  (req, res, next) => {
    var username = req.body.username;
    var password = req.body.password;

    return models.Users.create({username, password})
      .then((newuser) =>{
        res.redirect('/');
        return res.send('new user is created');
      })
      .catch(err => {
        res.status(500);
        res.redirect('/signup');
        res.send('User already existed');
      });

  });

app.post('/links',
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
