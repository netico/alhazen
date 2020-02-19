const express = require('express');

const auth = require('../controllers/auth');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.query.logged) {
    return res.render('home');
  }
  return res.redirect('/views');
});

// Login Auth
router.get('/login', auth.checkAuth, auth.loginGet);
router.get('/logout', auth.logout);
router.get('/auth/google', auth.googleAuth);
router.get('/auth/google/callback', auth.googleAuthCallback);

module.exports = router;
