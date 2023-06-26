const {
  body,
  check
} = require('express-validator');
const {
  countryCodes, currencyCodes, bankCodes
} = require('../constants');
const {
  BankAccount
} = require('../models');
const { formInputToDate } = require('../utils');
const BaseValidator = require('./BaseValidator');

class UserValidator extends BaseValidator {

  static setPinRules() {
    return [
      body('pin')
      .isNumeric()
      .withMessage('PIN value must be numeric.')
      .isLength({
        min: 4,
        max: 4
      })
      .withMessage('PIN must be 4 characters long.')
    ]
  }

  static updatePinRules() {
    return [
      body('old_pin')
      .isNumeric()
      .withMessage('Old PIN value must be numeric.')
      .isLength({
        min: 4,
        max: 4
      })
      .withMessage('Old PIN must be 4 characters long.'),
      body('new_pin')
      .isNumeric()
      .withMessage('New PIN value must be numeric.')
      .isLength({
        min: 4,
        max: 4
      })
      .withMessage('New PIN must be 4 characters long.')

    ]
  }


  static updatePasswordRules() {
    return [
      body('old_password')
      .notEmpty()
      .withMessage('Old password is required.'),
      body('new_password')
      .notEmpty()
      .withMessage('New password is required.')
    ]
  }

  static addAccountValidation = [
    check('account_number')
    .notEmpty()
    .withMessage('Account number is required.')
    .custom((value) => new Promise(async (resolve, reject) => {
      const account = await BankAccount.findOne({
        where: {
          account_number: value
        }
      });
      if (account) return reject('Account number already taken.');
      resolve(true);
    })),
    check('bank_code')
    .notEmpty()
    .withMessage('Bank is required.')
    .bail()
    .isIn(bankCodes)
    .withMessage('Bank not supported'),
    this.validate
  ]

  static updateProfileValidation = [
    body('first_name')
    // .optional({checkFalsy: true})
    .notEmpty()
    .withMessage('First name is required'),
    body('last_name')
    // .optional({checkFalsy: true})
    .notEmpty()
    .withMessage('Last name is required'),
    body('phone')
    .optional({
      checkFalsy: true
    })
    .isMobilePhone()
    .withMessage('Invalid mobile number format'),
    body('country')
    .optional({
      checkFalsy: true
    })
    .isIn(countryCodes)
    .withMessage('Inalid country code'),
    body('currency')
    .optional({
      checkFalsy: true
    })
    .isIn(currencyCodes)
    .withMessage('Inalid currency code'),
    body('location')
    .optional({
      checkFalsy: true
    }),
    body('gender')
    .optional({
      checkFalsy: true
    })
    .isIn(['male', 'female'])
    .withMessage('Allowed genders are male and female.'),
    body('marital_status')
    .optional({
      checkFalsy: true
    })
    .isIn(['married', 'single', 'divorced'])
    .withMessage('Allowed marital status are married, single and divorced.'),
    body('dob')
    .optional({
      checkFalsy: true
    })
    .isDate({
      format: 'DD-MM-YYYY',
      strictMode: true
    })
    .withMessage(`Date of birth should be a valid date.`)
    .customSanitizer(formInputToDate)
    .isBefore()
    .withMessage('Date of birth should be before today.'),
    this.validate
  ]
  static userRegister = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('email').notEmpty().withMessage('Email address must not be empty'),
    body('phone')
    .optional({
      checkFalsy: true
    })
    .isMobilePhone()
    .withMessage('Invalid mobile number format'),
    body('country')
    .optional({
      checkFalsy: true
    })
    .isIn(countryCodes)
    .withMessage('Inalid country code'),
    body('location')
    .optional({
      checkFalsy: true
    }),
    this.validate
  ]
}

module.exports = UserValidator;