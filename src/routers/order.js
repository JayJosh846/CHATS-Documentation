const router = require('express').Router();

const {
  Auth,
  BeneficiaryAuth,
  NgoSubAdminAuth,
  IsOrgMember,
  IsRequestWithValidPin,
  VendorAuth,
} = require('../middleware');

const {
  OrderController,
} = require('../controllers');

const {
  ParamValidator,
  OrderValidator,
} = require('../validators');

router.get(
  '/product-purchased-gender/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  OrderController.productPurchasedByGender,
);
router.get(
  '/product-purchased-age/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  OrderController.productPurchasedByAgeGroup,
);
router.get(
  '/total-sold-value/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  OrderController.soldAndValue,
);

// Refactord routes
router
  .route('/:reference')
  .get(Auth, ParamValidator.Reference, OrderController.getOrderByReference);

router
  .route('/:reference/pay/:userwallet_id/:campaignwallet_id')
  .post(
    BeneficiaryAuth,
    OrderValidator.CompleteOrder,
    IsRequestWithValidPin,
    OrderController.completeOrder,
  );
router.post(
  '/token/confirm-payment/:reference',
  VendorAuth,
  OrderController.comfirmsmsTOKEN,
);

module.exports = router;
