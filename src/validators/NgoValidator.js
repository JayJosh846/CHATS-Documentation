const { body } = require('express-validator');
const { OrgRoles } = require('../utils')
const BaseValidator = require('./BaseValidator');
class NgoValidator extends BaseValidator {
  static createMemberRules() {
    return [
      body('email')
      .isEmail()
      .withMessage(`Valid email format required.`),
      body(`phone`)
      .isMobilePhone(undefined, {
        strictMode: false
      })
      .withMessage(`Valid phone format required.`),

      body(`first_name`)
      .isLength({
        min: 2,
        max: 100
      })
      .withMessage(`First name should be between 2 and 100 characters.`),
      body(`last_name`)
      .isLength({
        min: 2,
        max: 100
      })
      .withMessage(`Last name should be between 2 and 100 characters.`),
      body('role')
        .isIn(Object.values(OrgRoles))
        .withMessage(`Role must be any of [${Object.values(OrgRoles).join(', ')}]`)
    ]
  }
}

module.exports = NgoValidator;