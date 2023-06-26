const {
  param,
  body
} = require('express-validator');
const {
  HttpStatusCode,
  formInputToDate
} = require('../utils');
const {
  CampaignService,
  BeneficiaryService,
  UserService
} = require('../services');
const formidable = require("formidable");
const Validator = require("validatorjs");
const {
  Response
} = require('../libs');
const BaseValidator = require('./BaseValidator');

class BeneficiaryValidator extends BaseValidator {
  static ApprovedBeneficiary = [
    body('beneficiary_id')
    .notEmpty()
    .withMessage('Valid beneficiary is required.')
    .bail()
    .isInt()
    .withMessage('Beneficiary ID must be a valid integer.'),
    body('approved')
    .custom((approved, { req }) => new Promise((resolve, reject) => {
      if (typeof req.body.rejected == 'undefined' && typeof approved == 'undefined') {
        reject('Either approval or rejection state is required.');
        return;
      }
      resolve(true)
    }))
    .bail()
    .if(body('approved').exists())
    .isBoolean()
    .withMessage('Approval state must be a boolean.'),
    body('rejected')
    .custom((rejected, { req }) => new Promise((resolve, reject) => {
      if (typeof req.body.approved == 'undefined' && typeof rejected == 'undefined') {
        reject('Either rejection or approval state is required.');
        return;
      }
      resolve(true)
    }))
    .bail()
    .if(body('rejected').exists())
    .isBoolean()
    .withMessage('Rejection state must be a boolean.'),
    this.validate
  ];

  static selfRegisterRules() {
    return [
      body('first_name')
      .notEmpty()
      .withMessage('First name is required.'),
      body('last_name')
      .notEmpty()
      .withMessage('Last name is required.'),
      body('email')
      .isEmail()
      .withMessage('Email is not a valid email address.'),
      body('phone')
      .isMobilePhone()
      .withMessage('Phone number is not a vlaid phone number.'),
      body('gender')
      .isIn(['male', 'female'])
      .withMessage('Gender must be any of [male, female]'),
      body('address')
      .notEmpty()
      .withMessage('Address is required'),
      body('password')
      .notEmpty()
      .withMessage('Password is required.'),
      body('dob')
      .isDate({
        format: 'DD-MM-YYYY',
        strictMode: true
      })
      .withMessage('Date of birth must be a valid date.')
      .isAfter()
      .withMessage('Date of birth must be before today.')
      .customSanitizer(formInputToDate)
    ]
  }

  static gender() {
    return [
      param('gender').isString().withMessage('gender must be string')
      .notEmpty()
      .withMessage('task progress Id must not be empty.'),

    ]
  }
  static ageGroup() {
    return [
      param('ageGroup').isNumeric().withMessage('gender must be numeric')
      .notEmpty()
      .withMessage('task progress Id must not be empty.'),

    ]
  }


  static async validateSelfRegister(req, res, next) {
    const form = new formidable.IncomingForm({
      multiples: true
    });

    form.parse(req, (err, fields, files) => {
      const rules = {
        first_name: "required|alpha",
        last_name: "required|alpha",
        email: "required|email",
        phone: "required|numeric",
        gender: "required|in:male,female",
        address: "string",
        password: "required",
        dob: "date|before:today",
      };

      const allowedFileTypes = ["image/jpeg", "image/png", "image/jpg"];

      fields["today"] = new Date(Date.now()).toDateString();

      const validation = new Validator(fields, rules);

      if (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Form parsing failed. Please try again.');
        Response.send(res);
        return;
      }

      if (validation.fails()) {
        Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', validation.errors.errors);
        return Response.send(res);
      }

      if (!files.profile_pic) {
        Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', {
          profile_pic: ["Profile image is required"],
        });
        return Response.send(res);
      }

      if (!allowedFileTypes.includes(files.profile_pic.type.toLowerCase())) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', {
            profile_pic: ["Invalid File type. Only jpg, png and jpeg files allowed for Profile picture"]
          },

        );
        return Response.send(res);
      }

      req.files = files;
      req.body = {
        ...req.body,
        ...fields
      }
      next();
    });
  }

  static async IsCampaignBeneficiary(req, res, next) {
    try {
      const campaignId = req.params.campaign_id || req.body.campaign_id || campaign.id;
      const beneficiaryId = req.params.beneficiary_id || req.body.beneficiary_id || req.user.id;

      if (!campaignId.trim()) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Valid campaign ID is missing.');
        return Response.send(res);
      }

      const campaign = req.campaign || await CampaignService.getCampaignById(campaignId);

      if (!campaign) {
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Campaign not found.');
        return Response.send(res);
      }

      if (await CampaignService.campaignBeneficiaryExists(campaignId, beneficiaryId)) {
        req.campaign = campaign;
        req.beneficiary_id = beneficiaryId;
        next();
        return;
      }

      Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'User is not a campaign beneficiary.');
      return Response.send(res);
    } catch (error) {
      
      Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Internal server error. Please try again or contact the administrator.');
      return Response.send(res);
    }
  }

  static async NotCampaignBeneficiary(req, res, next) {
    try {
      const campaignId = req.params.campaign_id || req.body.campaign_id || campaign.id || '';
      const beneficiaryId = req.params.beneficiary_id || req.body.beneficiary_id || req.user.id || '';

      if (!campaignId.trim()) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Valid campaign ID is missing.');
        return Response.send(res);
      }

      const campaign = await CampaignService.getCampaignById(campaignId);

      if (!campaign) {
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Campaign not found.');
        return Response.send(res);
      }

      const beneficiary = await CampaignService.campaignBeneficiaryExists(campaignId, beneficiaryId);

      if (!beneficiary) {
        req.campaign = campaign;
        req.beneficiary_id = beneficiaryId;
        return next();
      }

      Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'User is already a beneficiary.');
      return Response.send(res);
    } catch (error) {
      
      Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Server Error: Please try again.');
      return Response.send(res);
    }
  }

  static async BeneficiaryExists(req, res, next) {
    try {
      const organisationId = req.organisation.id || req.params.organisation_id || req.body.organisation_id || null;
      const id = req.params.beneficiary_id || req.body.beneficiary_id || req.params.id;

      if (!id) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Beneficiary ID is missing.');
        return Response.send(res);
      }
      const beneficiary = await UserService.findBeneficiary(id, organisationId);

      if (!beneficiary) {
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Organisation beneficiary not found.');
        return Response.send(res);
      }

      req.beneficiary = beneficiary;
      next();
    } catch (error) {
      
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please try again.');
      return Response.send(res);
    }
  }
}

module.exports = BeneficiaryValidator;