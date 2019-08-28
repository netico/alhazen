const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { nav: 'home' });
});

module.exports = router;
