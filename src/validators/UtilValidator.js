const {
  query
} = require("express-validator");
const {
  bankCodes
} = require('../constants')
const BaseValidator = require("./BaseValidator");

class UtilValidator extends BaseValidator {
  static getBanksValidator = [
    query('perPage')
    .optional()
    .isInt()
    .withMessage('perPage must be numeric if provided.'),
    query('page')
    .optional()
    .isInt()
    .withMessage('page must be numeric if provided.'),
    query('type')
    .optional(),
    query('currency')
    .optional()
    .isIn(['NGN'])
    .withMessage('Currency must be one of [NGN]'),
    query('country')
    .optional()
    .isIn(['nigeria'])
    .withMessage('Currency must be one of [nigeria]'),
    this.validate
  ]

  static resolveAccountValidator = [
    query('account_number')
    .notEmpty()
    .withMessage('Account number is required.')
    .bail()
    .isAlphanumeric()
    .withMessage('Invalid bank account format.'),
    query('bank_code')
    .notEmpty()
    .withMessage('Bank is required.')
    .bail()
    .isIn(bankCodes)
    .withMessage('Bank not supported'),
    this.validate
  ]

}

module.exports = UtilValidator;