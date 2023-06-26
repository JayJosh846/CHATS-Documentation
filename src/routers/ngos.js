const {
  AuthController,
  NgoController,
  OrganisationController
} = require('../controllers');
const {
  FieldAgentAuth,
  NgoAdminAuth,
  NgoSubAdminAuth,
  SuperAdminAuth,
  IsOrgMember
} = require('../middleware');
const {
  NgoValidator,
  CommonValidator,
  VendorValidator,
  ParamValidator
} = require('../validators');
const router = require('express').Router();

router.get('/', NgoController.getAllNGO);
router.get('/:id', SuperAdminAuth, NgoController.getOneNGO);

// auth/register
router.post('/auth/onboard', AuthController.createNgoAccount);

// admin/create - email
router
  .route(`/:organisation_id/members`)
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    NgoController.members
  )
  .post(
    NgoAdminAuth,
    IsOrgMember,
    NgoValidator.createMemberRules(),
    NgoValidator.validate,
    CommonValidator.checkEmailNotTaken,
    CommonValidator.checkPhoneNotTaken,
    NgoController.createAdminMember
  );

// sub-admin/reset-password

// vendors/create - generate vendor and password
router.post(
  '/vendors/create',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  VendorValidator.createVendorRules(),
  VendorValidator.validate,
  VendorValidator.VendorStoreExists,
  OrganisationController.createVendor
);

router.get(
  '/campaign/vendor/product',
  NgoController.viewProductVendorOnCampaign
);

// vendors/deactivate'

router.post(
  '/:organisation_id/beneficiaries',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  AuthController.createBeneficiary
);
router.post(
  '/:organisation_id/beneficiaries/special-case',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  AuthController.sCaseCreateBeneficiary
);

module.exports = router;
