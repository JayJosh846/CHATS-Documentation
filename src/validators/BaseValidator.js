const { Response } = require("../libs");
const { HttpStatusCode } = require("../utils");
const { validationResult, query } = require('express-validator');


class BaseValidator {
  static validate(req, res, next) {
    const errors = validationResult(req);

    if (errors.isEmpty()) return next();

    const extractedErrors = {};

    errors
      .array()
      .forEach((err) => {
        extractedErrors[err.param] = extractedErrors[err.param] || [];
        extractedErrors[err.param].push(err.msg);
      });

    Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed.', extractedErrors)
    return Response.send(res);
  }

  static paginationValidationRules() {
    return [
      query('pageNumber')
        .isNumeric()
        .withMessage('pageNumber must be numeric.')
        .custom((value) => isInt(value, { min: 1 }))
        .withMessage('pageNumber must not be less than 1.'),
    ];
  }
}

module.exports = BaseValidator;