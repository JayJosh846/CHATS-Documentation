const { param } = require('express-validator');
const BaseValidator = require('./BaseValidator');

class ParamValidator extends BaseValidator {
  static WalletIdOptional = [
    param('wallet_id')
    .optional({checkFalsy: true})
    .isUUID()
    .withMessage('Invalid wallet ID parameter format.'),
    this.validate
  ]

  static OrganisationId = [
    param('organisation_id')
    .notEmpty()
    .withMessage('organisation ID parameter is required.')
    .isNumeric()
    .withMessage('organisation ID parameter must be numeric'),
    this.validate
  ]

  static VendorId = [
    param('vendor_id')
    .notEmpty()
    .withMessage('Vendor ID parameter is required.')
    .isNumeric()
    .withMessage('Vendor ID parameter must be numeric'),
    this.validate
  ]

  static OrderId = [
    param('order_id')
    .notEmpty()
    .withMessage('Order ID parameter is required.')
    .isNumeric()
    .withMessage('Order ID parameter must be numeric'),
    this.validate
  ]

  static Reference = [
    param('reference')
    .notEmpty()
    .withMessage('Reference parameter is required.')
    .isAlphanumeric()
    .withMessage('Alhpanumeric reference parameter allowed'),
    this.validate
  ]

  static ReferenceOptional = [
    param('reference')
    .optional({checkFalsy: true})
    .isAlphanumeric()
    .withMessage('Alhpanumeric reference parameter allowed'),
    this.validate
  ]

  static CampaignId = [
    param('campaign_id')
    .notEmpty()
    .withMessage('Campaign ID parameter is required.')
    .isAlphanumeric()
    .withMessage('Campaign ID parameter must be numeric'),
    this.validate
  ]

  static ProductId = [
    param('productId')
    .notEmpty()
    .withMessage('Product ID parameter is required.')
    .isAlphanumeric()
    .withMessage('Product ID parameter must be numeric'),
    this.validate
  ]

  static CampaignIdOptional = [
    param('campaign_id')
    .optional({checkFalsy: true})
    .isAlphanumeric()
    .withMessage('Campaign ID parameter must be numeric'),
    this.validate
  ]


}

module.exports = ParamValidator;