const express = require('express');

const views = require('../controllers/views');
const auth = require('../controllers/auth');
const { validationMiddleware } = require('../config/validators/view');
const logger = require('../config/logger');

const router = express.Router();

const adminAccess = (req, res, next) => {
  if (req.user.role === 'admin') {
    logger.log('info', 'User %s has "admin" authorization', req.user.email);
    return next();
  }
  logger.log('error', "Unauthorized! User %s doesn't have 'admin' authorization", req.user.email);
  return res.sendStatus(401);
};


router.use(auth.checkAuth);

router.get('/', views.index);

// Views Settings
router.get('/settings', adminAccess, views.settings);

router.get('/create/:type', adminAccess, (req, res) => {
  res.send('create');
});

// Views Routes
router.get('/:type/:name', views.displayChart);

router.get('/:type/:name/reload', views.reloadData);

router.get('/:type/:name/download', views.downloadCsv);

router.get('/:type/:name/update', adminAccess, views.settingsView);

router.put('/:type/:name/update', adminAccess, validationMiddleware, views.updateView);

// Redirect to views list
router.get('/:type', (req, res) => {
  res.redirect('/views');
});

module.exports = router;
