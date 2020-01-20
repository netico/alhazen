const jwt = require('jsonwebtoken');
const mariadb = require('mariadb');
const { OAuth2Client } = require('google-auth-library');

const { secret, usersDb, CLIENT_ID } = require('../config');
const logger = require('../config/logger');

const googleTokenVerify = async (token) => {
  const client = new OAuth2Client(CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload;
};

module.exports = {

  loginGet: (req, res) => {
    if (req.cookies && req.cookies.access_token !== undefined) {
      const token = req.cookies.access_token.split(' ')[1];
      try {
        const payload = jwt.verify(token, secret);
        if (payload) {
          logger.log('info', 'User logged in: %s (id: %s);', payload.email, payload.id);
          return res.redirect('/');
        }
        return res.render('login', { error: '' });
      } catch (error) {
        logger.log('error', 'Error on verifing JWT token [%s]; Error: %s;', token, error.message);
      }
    }
    return res.render('login', { error: '' });
  },

  loginPost: async (req, res) => {
    const { idToken } = req.body;
    try {
      const {
        email, name, picture, given_name, family_name,
      } = await googleTokenVerify(idToken);
      try {
        const conn = await mariadb.createConnection(usersDb);
        // Query: return user email and check active status
        const rows = await conn.query('SELECT user_id, email, role FROM users WHERE email = ? AND active = 1', email);
        if (rows.length === 1) {
          // JWT payload
          const payload = {
            id: rows[0].user_id,
            fullName: name,
            firstName: given_name,
            lastName: family_name,
            email,
            picture,
            role: rows[0].role,
          };
          try {
            await conn.query('UPDATE users SET picture_link = ? WHERE user_id = ?', [payload.picture, payload.id]);
          } catch (error) {
            logger.log('error', 'Database error updating user picture. Error: %s;', error.message);
          }
          const token = jwt.sign(payload, secret, { expiresIn: '5 h' });
          logger.log('info', 'User logged in: %s (id: %s);', email, payload.id);
          return res.status(201)
            .cookie('access_token', `Bearer ${token}`, {
              secure: false, // Set true in HTTPS
              httpOnly: true,
              sameSite: true,
              expires: new Date(Date.now() + 5 * 3600000),
            }).send();
        }
        conn.end();
        // Unauthorized
        logger.log('error', 'Database Authentication failed for user: %s;', email);
        return res.sendStatus(401);
      } catch (err) {
        logger.log('error', 'Database failed on login process. User: %s; Error: %s;', email, err.message);
        return res.sendStatus(500);
      }
    } catch (error) {
      logger.log('error', 'Google Authentication failed. Error: %s', error.message);
      return res.sendStatus(401);
    }
  },

  verify: (req, res, next) => {
    if (req.cookies && req.cookies.access_token !== undefined) {
      const authCookie = req.cookies.access_token.split(' ');
      if (authCookie[0] === 'Bearer') {
        const token = authCookie[1];
        try {
          const payload = jwt.verify(token, secret);
          req.user = payload;
          return next();
        } catch (error) {
          logger.log('error', 'Error on verifing JWT token [%s]; Error: %s;', token, error.message);
          return res.redirect('/login');
        }
      }
      return res.redirect('/login');
    }
    return res.redirect('/login');
  },
};
