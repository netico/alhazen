const jwt = require('jsonwebtoken');
const mariadb = require('mariadb');
// const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');


const { secret, usersDb, CLIENT_ID } = require('../config');

const googleTokenVerify = async (token) => {
  const client = new OAuth2Client(CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const playload = ticket.getPayload();
  return playload;
};

module.exports = {

  login: async (req, res) => {
    const { idToken } = req.body;
    try {
      const {
        email, name, picture, given_name, family_name,
      } = await googleTokenVerify(idToken);
      try {
        const conn = await mariadb.createConnection(usersDb);
        // Query: return user email and check active status
        const rows = await conn.query('SELECT user_id, email FROM users WHERE email = ? AND active = 1', email);
        conn.end();
        if (rows.length === 1) {
          // JWT Playload
          const playload = {
            id: rows[0].user_id,
            fullName: name,
            firstName: given_name,
            lastName: family_name,
            email,
            picture,
          };
          const token = jwt.sign(playload, secret, { expiresIn: '1 h' });
          res.status(201)
            .cookie('access_token', `Bearer ${token}`, {
              secure: false, // Set true in HTTPS
              httpOnly: true,
              sameSite: true,
              expires: new Date(Date.now() + 1 * 3600000),
            }).send();
          return;
        }
        // segnalare errore
        res.sendStatus(500);
        return;
      } catch (err) {
        conn.end();
        console.log(err);
        res.sendStatus(500);
        return;
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  },

  verify: (req, res, next) => {
    if (req.cookies && req.cookies.access_token !== undefined) {
      const authCookie = req.cookies.access_token.split(' ');
      if (authCookie[0] === 'Bearer') {
        const token = authCookie[1];
        try {
          const playload = jwt.verify(token, secret);
          req.user = playload;
          next();
          return;
        } catch (error) {
          res.redirect('/login');
          return;
        }
      }
      res.redirect('/login');
      return;
    }
    res.redirect('/login');
  },

  verifyToken: (token) => {
    try {
      const decode = jwt.verify(token, secret);
      return decode;
    } catch (error) {
      return false;
    }
  },

};
