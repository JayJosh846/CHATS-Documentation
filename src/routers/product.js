const router = require('express').Router();

const {
  WalletController,
  ProductController,
  OrganisationController,
  CampaignController,
  ComplaintController,
  BeneficiaryController,
} = require('../controllers');

const {
  Auth,
  FieldAgentAuth,
  NgoAdminAuth,
  NgoSubAdminAuth,
  IsOrgMember,
} = require('../middleware');
const multer = require('../middleware/multer');
const {
  CommonValidator,
  VendorValidator,
  CampaignValidator,
  OrganisationValidator,
  ProductValidator,
  ComplaintValidator,
  BeneficiaryValidator,
  WalletValidator,
  FileValidator,
  ParamValidator,
} = require('../validators');

router.get(
  '/:productId/product/:campaign_id',
  NgoSubAdminAuth,
  ParamValidator.CampaignId,
  ParamValidator.ProductId,
  ProductController.getCampaignProduct,
);

module.exports = router;
