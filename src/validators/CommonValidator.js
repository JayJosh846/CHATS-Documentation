const {
  HttpStatusCode
} = require("../utils");

const {
  UserService
} = require('../services');
const {
  Response
} = require('../libs');

class CommonValidator {
  static async checkEmailNotTaken(req, res, next) {
    const email = req.body.email || req.params.email;
    try {
      if (!email) {
        next();
        return;
      }
      const user = await UserService.findByEmail(email);
      if (!user) return next();
      Response.setError(
        HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
        'Validation Failed!', {
          email: [`Email is taken. Unique email is required.`]
        }
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Email validation failed.`);
      return Response.send(res);
    }
  }

  static async checkPhoneNotTaken(req, res, next) {
    const email = req.body.phone || req.params.phone;
    try {
      const user = await UserService.findByEmail(email);
      if (!user) return next();
      Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', {
        phone: [`Phone number is taken. Unique email is required.`]
      });
      return Response.send(res);
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Phone validation failed.`);
      return Response.send(res);
    }
  }
}

module.exports = CommonValidator;