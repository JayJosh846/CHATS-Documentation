const {body} = require('express-validator');
const {isAfter} = require('validator');
const {Response} = require('../libs');
const CampaignService = require('../services/CampaignService');
const {HttpStatusCode, formInputToDate} = require('../utils');
const BaseValidator = require('./BaseValidator');

class CampaignValidator extends BaseValidator {
  static campaignTypes = ['campaign', 'cash-for-work', 'item'];
  static campaignStatuses = ['pending', 'active', 'paused', 'completed'];
  static requestStatuses = ['approved', 'rejected'];

  static approveOrRejectRequest() {
    return [
      body('type')
        .not()
        .isEmpty()
        .withMessage(`Request type is required.`)
        .isIn(this.requestStatuses)
        .withMessage(
          `Campaign type should be one of: [${this.requestStatuses.join(', ')}]`
        )
    ];
  }
  static extendCampaign() {
    return [
      body('end_date')
        .isDate({
          format: 'DD-MM-YYYY',
          strictMode: true
        })
        .withMessage(`Campaign start date should be a valid date.`)
        .customSanitizer(formInputToDate)
        .isAfter()
        .withMessage('Campaign start date should be after today.')
    ];
  }
  static requestFund() {
    return [
      body('donor_organisation_id')
        .notEmpty()
        .withMessage('Donor organisation ID must not be empty')
        .isInt()
        .withMessage(`Donor organisation ID must be an integer`),
      body('reason')
        .notEmpty()
        .withMessage('Reason for withdrawal is required.')
        .isLength({
          min: 5,
          max: 200
        })
        .withMessage(
          'Reason for withdrawal should be between 5 and 200 characters.'
        )
    ];
  }
  static createCampaignRules() {
    return [
      body('title').not().isEmpty().withMessage(`Campaign title is required.`),
      body('type')
        .not()
        .isEmpty()
        .withMessage(`Campaign type is required.`)
        .isIn(this.campaignTypes)
        .withMessage(
          `Campaign type should be one of: [${this.campaignTypes.join(', ')}]`
        ),
      body('description')
        .not()
        .isEmpty()
        .withMessage(`Campaign description is required.`),
      body('budget')
        .optional({
          nullable: true,
          checkFalsy: true
        })
        .isDecimal()
        .withMessage(`Campaign budget must be a valid decimal`),
      body('minting_limit')
        .optional({
          nullable: true,
          checkFalsy: true
        })
        .isNumeric()
        .withMessage(`Campaign budget must be a valid number`),
      body('location').optional({
        nullable: true,
        checkFalsy: true
      }),
      body('start_date')
        .isDate({
          format: 'DD-MM-YYYY',
          strictMode: true
        })
        .withMessage(`Campaign start date should be a valid date.`)
        .customSanitizer(formInputToDate)
        .isAfter()
        .withMessage('Campaign start date should be after today.'),
      body('end_date')
        .isDate({
          format: 'DD-MM-YYYY',
          strictMode: true
        })
        .withMessage(`Campaign end date should be a valid date.`)
        .customSanitizer(formInputToDate)
      // .custom(
      //   (val, { req }) => isAfter(val, req.body.start_date)
      // )
      // .withMessage(`Campaign end date should be after start date.`)
    ];
  }

  static updateCampaignRules() {
    const rules = this.createCampaignRules();
    rules.push(
      body('status')
        .isIn(this.campaignStatuses)
        .withMessage(
          `Campaign status should be one of: [${this.campaignStatuses.join(
            ', '
          )}]`
        )
    );
    return rules.map(rule =>
      rule.optional({
        nullable: true,
        checkFalsy: true
      })
    );
  }

  static async campaignTitleExists(req, res, next) {
    try {
      if (!req.body.title) {
        next();
        return;
      }
      const existing = await CampaignService.searchCampaignTitle(
        req.body.title
      );
      if (existing) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
          'Campaign with similar title exists.'
        );
        return Response.send(res);
      }
      next();
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Error occured. Contact support.' + error
      );
      return Response.send(res);
    }
  }

  static async campaignExists(req, res, next) {
    try {
      const id = req.body.campaign_id || req.params.campaign_id;
      if (!id) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
          'Campaign ID is required'
        );
        return Response.send(res);
      }
      const campaign = await CampaignService.getCampaignById(id);
      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign does not exist.'
        );
        return Response.send(res);
      }

      req.campaign = campaign;
      next();
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Error occured. Please contact support.'
      );
      return Response.send(res);
    }
  }

  static async campaignBelongsToOrganisation(req, res, next) {
    try {
      const id = req.body.campaign_id || req.params.campaign_id;
      console.log(req.params.campaign_id, 'req.params.campaign_id');
      const organisationId =
        req.body.organisation_id ||
        req.params.organisation_id ||
        req.query.organisation_id ||
        req.organisation.id;
      if (!id) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
          'Input Validation Error.',
          {
            campaign_id: ['Valid Campaign ID is required']
          }
        );
        return Response.send(res);
      }

      const campaign = await CampaignService.getCampaignById(id);
      if (!campaign) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign does not exist.'
        );
        return Response.send(res);
      }

      if (!organisationId) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
          'Input Validation Error',
          {
            organisation_id: ['Organisation ID is required']
          }
        );
        return Response.send(res);
      }

      if (organisationId != campaign.OrganisationId) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign does not belong to Organisation.'
        );
        return Response.send(res);
      }
      req.campaign = campaign;
      next();
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Error occured. Please contact support.'
      );
      return Response.send(res);
    }
  }
}

module.exports = CampaignValidator;
