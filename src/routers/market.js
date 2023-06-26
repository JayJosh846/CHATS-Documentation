const router = require('express').Router();

const {MarketController} = require('../controllers');
const {FieldAgentAuth, NgoAdminAuth, IsOrgMember} = require('../middleware');
const {
  NgoValidator,
  CommonValidator,
  VendorValidator,
} = require('../validators');

router.get('/', MarketController.getAllProductPurchasedByGender);

module.exports = router;
