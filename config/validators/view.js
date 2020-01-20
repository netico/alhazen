const { check } = require('express-validator');
const validationMid = require('./index');

const validatorChain = [
  check('info.viewName', "View Name can't be an empty field").exists().bail().not()
    .isEmpty(),
  check('info.active').exists({ checkNull: true }).bail().isBoolean(),
  check('info.description').exists(),
  check('info.source_db').exists().bail()
    .toInt()
    .isInt(),
  check('info.view_query').exists().bail().not()
    .isEmpty(),
  check('settings.serieField', "Serie Field can't be an empty field").if((value, { req }) => req.params.type !== 'straight-table').exists().bail()
    .not()
    .isEmpty(),
  check('settings.trendBy').if((value, { req }) => req.params.type !== 'straight-table' && req.params.type !== 'pie-chart').exists(),
  check('settings.colorPalette').if((value, { req }) => req.params.type !== 'straight-table').exists().bail()
    .toInt()
    .isInt(),
  check('settings.legendPosition').if((value, { req }) => req.params.type !== 'straight-table').exists().bail()
    .not()
    .isEmpty()
    .bail()
    .isIn(['top', 'bottom', 'left', 'right']),
  check('settings.stepSize').if((value, { req }) => req.params.type !== 'straight-table' && req.params.type !== 'pie-chart').exists().bail()
    .toFloat()
    .isFloat({ min: 0 }),
  check('settings.sortLabel').if((value, { req }) => req.params.type !== 'straight-table').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.horizontal').if((value, { req }) => req.params.type === 'bar-chart').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.stacked').if((value, { req }) => req.params.type === 'bar-chart').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.beginAtZero').if((value, { req }) => req.params.type !== 'straight-table' && req.params.type !== 'pie-chart').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.fill').if((value, { req }) => req.params.type === 'line-chart').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.showLine').if((value, { req }) => req.params.type === 'line-chart').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.doughnut').if((value, { req }) => req.params.type === 'pie-chart').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.defaultBorder').if((value, { req }) => req.params.type === 'pie-chart').exists({ checkNull: true }).bail()
    .isBoolean(),
  check('settings.backgroundAlpha').if((value, { req }) => req.params.type !== 'straight-table').exists().bail()
    .toFloat()
    .isFloat({ min: 0, max: 1 }),
  check('settings.borderAlpha').if((value, { req }) => req.params.type !== 'straight-table').exists().bail()
    .toFloat()
    .isFloat({ min: 0, max: 1 }),
  check('settings.borderWidth').if((value, { req }) => req.params.type !== 'straight-table').exists().bail()
    .toInt()
    .isInt({ min: 0, max: 10 }),
  check('settings.lineTension').if((value, { req }) => req.params.type === 'line-chart').exists().bail()
    .toFloat()
    .isFloat({ min: 0, max: 0.4 }),
];

module.exports = {
  chain: validatorChain,
  validationMiddleware: [...validatorChain, validationMid],
};
