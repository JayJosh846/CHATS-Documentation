const { body } = require("express-validator");
const { paystackConfig } = require('../config');
const BaseValidator = require("./BaseValidator");

class WalletValidator extends BaseValidator {
  static fiatDepositRules() {
    return [
      body('amount')
      .notEmpty()
      .withMessage('Deposit amount is required. ')
      .isNumeric()
      .withMessage('Only numeric values allowed.')
      .custom((amount) => +amount > 0)
      .withMessage(`Deposit amount must be greater than 0.`),
      body('currency')
      .optional()
      .isAlpha()
      .withMessage('Only alphabets allowed.')
      .isUppercase()
      .withMessage('Only uppercase is allowed')
      .isIn(paystackConfig.currencies)
      .withMessage(`Deposit currency must any of [${paystackConfig.currencies.join(',')}]`)
    ]
  }
}

module.exports = WalletValidator;