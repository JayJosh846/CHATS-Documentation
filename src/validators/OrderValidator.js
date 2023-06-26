const {
  body,
  param
} = require('express-validator');
const BaseValidator = require('./BaseValidator');

class OrderValidator extends BaseValidator {
  static CompleteOrder = [
    param('reference')
    .notEmpty()
    .withMessage('Order reference parameter required.')
    .isAlphanumeric()
    .withMessage('Alhpanumeric reference parameter allowed'),
    body('pin')
    .notEmpty()
    .withMessage('Transaction PIN is required.')
    .isNumeric()
    .withMessage('Transaction PIN accepts only numeric characters.')
  ]
}

module.exports = OrderValidator;