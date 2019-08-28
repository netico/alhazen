const express = require('express');
const views = require('../controllers/views');

const router = express.Router();

router.get('/', views.index);

// Views Routes
router.get('/:type/:name', views.displayChart);

router.get('/:type/:name/reload', views.reloadData);

router.get('/:type/:name/download', views.downloadCsv);

// Redirect to views list
router.get('/:type', (req, res) => {
  res.redirect('/views', { nav: 'views' });
});

module.exports = router;
