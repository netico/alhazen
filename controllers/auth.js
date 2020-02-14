const jwt = require('jsonwebtoken');
const mariadb = require('mariadb');
const { OAuth2Client } = require('google-auth-library');

const { secret, usersDb, googleAuth } = require('../config');
const logger = require('../config/logger');

const serializeUser = async (userId, pictureLink, accessToken, refreshToken) => {
  try {
    const conn = await mariadb.createConnection(usersDb);
    await conn.query('UPDATE users SET picture_link = ?, accessToken = ?, refreshToken = ? WHERE user_id = ?', [pictureLink, accessToken, refreshToken, userId]);
    conn.end();
  } catch (error) {
    logger.log('error', 'Error on serialize user. Error: %s', error.message);
  }
};

const deserializeUser = async (placeholder, paramType) => {
  const query = `SELECT * FROM users WHERE active = 1 AND ${paramType} = ?`;
  const conn = await mariadb.createConnection(usersDb);
  const rows = await conn.query(query, placeholder);
  if (rows.length === 1) {
    return rows[0];
  }
  conn.end();
  return null;
};

const googleRefreshToken = async (oAuth2Client, refreshToken) => {
  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  try {
    const accessToken = await oAuth2Client.getAccessToken();
    return accessToken;
  } catch (error) {
    logger.log('error', 'Error refreshing Google accessToken. Error: %s', error.message);
    return null;
  }
};

module.exports = {

  loginGet: (req, res) => {
    const error = req.query.error ? 'An error occurred logging in. Please, retry later.' : '';
    res.render('login', { error });
  },

  googleAuth: (req, res) => {
    const oAuth2Client = new OAuth2Client(
      googleAuth.client_id,
      googleAuth.client_secret,
      googleAuth.redirect_uri,
    );
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
    });

    return res.redirect(authorizeUrl);
  },

  googleAuthCallback: async (req, res) => {
    const oAuth2Client = new OAuth2Client(
      googleAuth.client_id,
      googleAuth.client_secret,
      googleAuth.redirect_uri,
    );
    const { code } = req.query;
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: tokens.id_token,
      });
      const { email, picture, name } = ticket.getPayload();
      try {
        const user = await deserializeUser(email, 'email');
        if (user) {
          const payload = {
            id: user.user_id,
            fullName: name,
            picture,
            email,
            role: user.role,
          };
          const jwtToken = jwt.sign(payload, secret, { expiresIn: '2 years' });
          await serializeUser(user.user_id, picture, tokens.access_token, tokens.refresh_token);
          logger.log('info', 'User logged in: %s (id: %s);', email, payload.id);
          res.cookie('token', jwtToken, {
            secure: false, // Set true in HTTPS
            httpOnly: true,
            sameSite: true,
            expires: new Date(Date.now() + 2 * 365 * 24 * 3600000),
          });
          return res.redirect('/?logged=true');
        }
        logger.log('error', "User %s doesn't have the permission to login", email);
        await oAuth2Client.revokeToken(tokens.access_token);
        return res.redirect('/login?error=true');
      } catch (err) {
        logger.log('error', 'Error during deserializeUser. Error: %s', err.message);
        await oAuth2Client.revokeToken(tokens.access_token);
        return res.redirect('/login?error=true');
      }
    } catch (err) {
      logger.log('error', 'Google login error. Error: %s', err.message);
      return res.redirect('/login?error=true');
    }
  },

  // Delete also from DB accessToken and refreshToken
  logout: async (req, res) => {
    if (req.cookies && req.cookies.token) {
      const { token } = req.cookies;
      try {
        const payload = jwt.verify(token, secret);
        try {
          const user = await deserializeUser(payload.id, 'user_id');
          const oAuth2Client = new OAuth2Client(
            googleAuth.client_id,
            googleAuth.client_secret,
            googleAuth.redirect_uri,
          );
          await oAuth2Client.revokeToken(user.accessToken);
          try {
            await serializeUser(payload.id, user.pictureLink, null, null);
          } catch (error) {
            logger.log('error', 'Logout: database failed serializing user. User id: %s; Error: %s;', payload.id, error.message);
          }
          return res.clearCookie('token').redirect('/login');
        } catch (err) {
          logger.log('error', 'Error during deserializeUser. Error: %s', err.message);
          return res.sendStatus(500);
        }
      } catch (error) {
        logger.log('error', '');
        return res.sendStatus(500);
      }
    }
    return res.clearCookie('token').redirect('/login');
  },

  checkAuth: async (req, res, next) => {
    const { error, authLogin } = req.query;
    if (error || (req.path === '/login' && authLogin === 'false')) {
      return next();
    }

    if (req.cookies && req.cookies.token) {
      const { token } = req.cookies;
      try {
        const payload = jwt.verify(token, secret);
        if (payload.id) {
          // find user in db
          try {
            const user = await deserializeUser(payload.id, 'user_id');
            if (user && user.accessToken && user.refreshToken) {
              // check google token
              const oAuth2Client = new OAuth2Client(
                googleAuth.client_id,
                googleAuth.client_secret,
                googleAuth.redirect_uri,
              );
              try {
                await oAuth2Client.getTokenInfo(user.accessToken);
              } catch (err) {
                logger.log('error', 'Invalid Google accessToken. Try to refresh');
                const response = await googleRefreshToken(oAuth2Client, user.refreshToken);
                if (response) {
                  await serializeUser(
                    payload.id,
                    user.picture_link,
                    response.token,
                    user.refreshToken,
                  );
                  logger.log('info', 'Successfully refreshed Google accessToken. User: %s - ID: %s', payload.id, user.email);
                  req.user = payload;
                  if (req.path === '/login') {
                    return res.redirect('/?logged=true');
                  }
                  return next();
                }
                logger.log('error', 'Failed to refresh Google token.');
                return res.redirect('/login?authLogin=false');
              }
              req.user = payload;
              if (req.path === '/login') {
                return res.redirect('/');
              }
              return next();
            }
            return res.redirect('/login?authLogin=false');
          } catch (err) {
            logger.log('error', 'Database failed serializing user. User id: %s; Error: %s;', payload.id, err.message);
          }
        }
        // error
        logger.log('error', 'Payload id error');
        return res.redirect('/login?authLogin=false');
      } catch (err) {
        // log error
        logger.log('error', 'Error verifing JWT token. Error: %s', err.message);
      }
    }
    // NO TOKEN
    logger.log('error', 'No JWT Token');
    return res.redirect('/login?authLogin=false');
  },

};
