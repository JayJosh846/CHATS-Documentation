const { Response } = require('../libs');
const { body } = require('express-validator');
const { isEmail } = require('validator')
const { HttpStatusCode, compareHash } = require('../utils')
const { UserService, AuthService } = require('../services');
const BaseValidator = require('./BaseValidator');
const { SuperAdmin, GodMode, NgoAdmin, Vendor, Beneficiary } = require('../utils').AclRoles;

class AuthValidator extends BaseValidator {
  static selfResetAllowedFor = [SuperAdmin, GodMode, NgoAdmin, Vendor, Beneficiary];

  static requestPasswordResetRules() {
    return [
      body('email')
      .custom((val) => isEmail(val))
      .withMessage(`Email is not well formed.`)
      .optional({
        nullable: true,
        checkFalsy: true
      }),
      body('phone')
      .isMobilePhone()
      .withMessage(`Phone number is not well formed.`)
      .optional({
        nullable: true,
        checkFalsy: true
      })
    ]
  }

  static resetPasswordRules() {
    return [
      body('otp')
      .not().isEmpty()
      .withMessage('Password reset token is required.'),
      body('password')
      .not().isEmpty()
      .withMessage('Password is required.'),
      body('confirm_password')
      .not().isEmpty()
      .withMessage('Password confirmation is required.')
      .custom((val, {
        req
      }) => {
        return val == req.body.password
      })
      .withMessage('Password confirmation does not match.')
    ]
  }

  static async canResetPassword(req, res, next) {
    const query = {};
    const { email, phone } = req.body;
    email && Object.assign(query, { email });
    phone && Object.assign(query, { phone });

    if (!query.phone && !query.email) {
      Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Email or Phone number is required.');
      return Response.send(res);
    }

    const user = await UserService.findSingleUser(query);

    if (!user) {
      Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Account not found.');
      return Response.send(res);
    }

    if (!AuthValidator.selfResetAllowedFor.includes(user.RoleId)) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Reset password request not allowed for the user account.');
      return Response.send(res);
    }

    req.user = user;
    next();
  }

  static async checkResetPasswordToken(req, res, next) {
    const reference = req.body.ref;
    const record = reference && await AuthService.getPasswordTokenRecord(reference);
    if (!record) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Invalid or expired request. Please try again');
      if (!reference) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Invalid or missing reset password reference.');
      }
      return Response.send(res);
    }

    if (!compareHash(req.body.otp, record.token)) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Invalid or wrong OTP.');
      return Response.send(res);
    }

    req.user = await record.getUser();
    next()
  }
}

module.exports = AuthValidator;