const models = require('../models');
const Promise = require('bluebird');
const db = require('../db');


module.exports.createSession = (req, res, next) => {

  // helper fundtion to be reused
  var createSession = () => {
    models.Sessions.create()
      .then((queryResponse) => {
        var id = queryResponse.insertId;
        var queryScript = `SELECT hash FROM sessions WHERE id = ${id}`;
        return db.queryAsync(queryScript);
      })
      .then (([[{hash}]]) => {
        req.session = {hash};
        res.cookie('shortlyid', hash);
      })
      .catch((err) =>{
        console.log('Could not create a new session');
      })
      .then(()=>{
        next();
      });
  };

  if (Object.keys(req.cookies).length === 0) {
    createSession();
  } else {
    var hash = req.cookies['shortlyid'];
    req.session = {hash};
    var queryScript = `SELECT userId FROM sessions WHERE hash = "${hash}"`;
    db.query(queryScript, (err, [session]) => {
      if (session === undefined) {
        res.cookies = {};
        createSession();
      } else {
        // console.log(session);
        let userId = session.userId;
        if (!(userId === null)) {
          queryScript = `SELECT username FROM users WHERE id = ${userId}`;
          db.query(queryScript, (err, [user])=> {
            var username = user.username;
            var user = {username};
            req.session.user = user;
            req.session.userId = userId;
            next();
          });
        } else {
          next();
        }
      }
    });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

// CREATE TABLE IF NOT EXISTS sessions (
//   id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
//   hash VARCHAR(64),
//   userId INT