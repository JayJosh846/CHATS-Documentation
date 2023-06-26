const {
  Response
} = require("../libs");
const {
  HttpStatusCode
} = require("../utils");
const {
  OrganisationService
} = require("../services");
const BaseValidator = require("./BaseValidator");
const {
  body
} = require("express-validator");

class OrganisationValidator extends BaseValidator {
  // Delcare Rules here

  static profileUpdateRules() {
    return [
      body('country')
      .notEmpty()
      .withMessage('Organisation country is required.'),
      body('state')
      .notEmpty()
      .withMessage('Organisation state is required.'),
      body('address')
      .notEmpty()
      .withMessage('Organisation address is required.'),
      body('year_of_inception')
      .notEmpty()
      .withMessage('Year founded is required.'),
      body('website_url')
      .notEmpty()
      .withMessage('Organisation website is required.')
      .isURL()
      .withMessage('Website URL is invalid.')
    ]
  }

  static async organisationExists(req, res, next) {
    const organisationId = req.params.organisation_id || req.body.organisation_id;
    const organisation = await OrganisationService.findOneById(organisationId);

    if (!organisation) {
      Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Organisation not found.');
      return Response.send(res);
    }

    next();
  }
}
module.exports = OrganisationValidator;