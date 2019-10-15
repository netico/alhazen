const express = require('express');

const auth = require('../controllers/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect('/views');
});

// Login Auth
router.get('/login', (req, res) => {
  if (req.cookies && req.cookies.access_token !== undefined) {
    const token = req.cookies.access_token.split(' ')[1];
    const playload = auth.verifyToken(token);
    if (playload) {
      res.redirect('/');
      return;
    }
    res.render('login', { error: '' });
    return;
  }
  res.render('login', { error: '' });
});

router.get('/logout', (req, res) => {
  res.clearCookie('access_token').redirect('/login?action=logout');
});

router.post('/login', auth.login);

module.exports = router;
