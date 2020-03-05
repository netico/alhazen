const { check } = require('express-validator');
const validationMid = require('./index');

const validatorChain = [
  check('userID').if((value, { req }) => req.method === 'PUT').exists().bail()
    .not()
    .isEmpty()
    .bail()
    .toInt()
    .isInt(),
  check('fName', "Name field can't be empty").exists().withMessage("Name doesn't exist").bail()
    .not()
    .isEmpty(),
  check('lName', "Surname field can't be empty").exists().bail().not()
    .isEmpty(),
  check('email').exists().bail().not()
    .isEmpty()
    .bail()
    .isEmail(),
  check('active').exists().bail().isBoolean(),
];

module.exports = {
  chain: validatorChain,
  validationMiddleware: [...validatorChain, validationMid],
};
