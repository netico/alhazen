const express = require('express');
const views = require('../controllers/views');

const auth = require('../controllers/auth');

const router = express.Router();

router.use(auth.verify);

router.get('/', views.index);

// Views Routes
router.get('/:type/:name', views.displayChart);

router.get('/:type/:name/reload', views.reloadData);

router.get('/:type/:name/download', views.downloadCsv);

// Redirect to views list
router.get('/:type', (req, res) => {
  res.redirect('/views');
});

module.exports = router;
