const express = require('express');

const auth = require('../controllers/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect('/views');
});

// Login Auth
router.get('/login', auth.loginGet);

router.post('/login', auth.loginPost);

router.get('/logout', (req, res) => {
  res.clearCookie('access_token').redirect('/login?action=logout');
});

module.exports = router;
