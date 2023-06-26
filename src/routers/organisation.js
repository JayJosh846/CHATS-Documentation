const router = require('express').Router();

const {
  WalletController,
  OrganisationController,
  CampaignController,
  ComplaintController
} = require('../controllers');
const CashForWorkController = require('../controllers/CashForWorkController');
const UsersController = require('../controllers/UsersController');

const {
  DonorAuth,
  FieldAgentAuth,
  NgoAdminAuth,
  NgoSubAdminAuth,
  IsOrgMember
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
  ParamValidator
} = require('../validators');

router.post('/flutterwave/webhook', OrganisationController.mintToken);
router.post('/flutterwave/webhook2', OrganisationController.mintToken2);
router.post('/register', OrganisationController.register);
router.post('/bantu/webhook', OrganisationController.bantuTransfer);
router.get('/wallets/:organisationId', OrganisationController.getWallets);
router.get(
  '/wallets/main/:organisationId',
  OrganisationController.getMainWallet
);
router.get(
  '/wallets/campaign/:organisationId/:campaignId',
  OrganisationController.getCampignWallet
);
router.post('/member', OrganisationController.addMember);
router.get(
  '/transactions/:organisationId',
  OrganisationController.fetchTransactions
);
router.post('/campaign', OrganisationController.createCampaign);
router.put('/campaign', OrganisationController.updateCampaign);
router.post('/update-profile', OrganisationController.updateProfile);
router.post('/transfer/token', OrganisationController.transferToken);
router.get('/financials/:id', OrganisationController.getFinancials);

router.get(
  '/:organisation_id/onboarded/:campaign_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignIdOptional,
  CampaignController.campaignsWithOnboardedBeneficiary
);
router.post(
  '/extend-campaign/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  CampaignValidator.campaignBelongsToOrganisation,
  CampaignValidator.extendCampaign(),
  OrganisationController.extendCampaign
);
router.get(
  '/:campaign_id/campaign-history/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  CampaignValidator.campaignBelongsToOrganisation,
  OrganisationController.campaignHistory
);
router.post(
  '/request-withdrawal/:organisation_id',
  DonorAuth,
  ParamValidator.OrganisationId,
  CampaignValidator.campaignBelongsToOrganisation,
  CampaignValidator.requestFund(),
  OrganisationController.requestFund
);

router.post(
  '/:organisation_id/onboarded/:campaign_id/:replicaCampaignId',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignIdOptional,
  CampaignController.importBeneficiary
);
router.post(
  '/:organisation_id/campaign-funds-withdrawal/:campaign_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignIdOptional,
  CampaignController.withdrawFund
);

router.get(
  '/beneficiaries-summary/:id',
  OrganisationController.getBeneficiariesFinancials
);
router.get('/metric/:id', OrganisationController.getMetric);

router.post('/cash-for-work/field', CashForWorkController.pickTaskFromCampaign);

router.get('/matrics', NgoSubAdminAuth, OrganisationController.matrix);
router.post('/zoho-cretate-ticket', OrganisationController.createTicket);
router.post(
  '/ngo/zoho-create-ticket',
  NgoSubAdminAuth,
  OrganisationController.createTicketOrg
);
router.get('/zoho-token');
router
  .route('/zoho-token')
  .get(OrganisationController.fetchToken)
  .post(OrganisationController.saveToken)
  .delete(OrganisationController.destroyToken);

router.get(
  '/non-org-beneficiary',
  FieldAgentAuth,
  OrganisationController.non_ngo_beneficiaries
);

router.get(
  '/campaigns/transaction',
  NgoSubAdminAuth,
  OrganisationController.record
);
router.post('/beneficiaries/sms-token', CampaignController.sendSMStoken);

router.get(
  '/campaign/:campaign_id/balance/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignIdOptional,
  WalletController.CampaignBalance
);

router
  .route('/:organisation_id/wallets/transactions/:reference?')
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    ParamValidator.ReferenceOptional,
    WalletController.getOrgnaisationTransaction
  );

router
  .route('/:organisation_id/wallets/campaigns/:campaign_id?')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignIdOptional,
    WalletController.getOrganisationCampaignWallet
  );

router
  .route('/:organisation_id/wallets/paystack-deposit')
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    WalletValidator.fiatDepositRules(),
    WalletValidator.validate,
    WalletController.paystackDeposit
  );
router
  .route('/:organisation_id/wallets/:wallet_id?')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.WalletIdOptional,
    WalletController.getOrganisationWallet
  );

// Refactord routes
router
  .route('/:organisation_id/profile')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getProfile
  )
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationValidator.profileUpdateRules(),
    OrganisationValidator.validate,
    OrganisationController.completeProfile
  );
router
  .route('/:organisation_id/logo')
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    FileValidator.checkLogoFile(),
    OrganisationController.changeOrganisationLogo
  );

router
  .route('/:organisation_id/beneficiaries')
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getOrganisationBeneficiaries
  );

router
  .route('/:organisation_id/beneficiaries/transactions')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getBeneficiariesTransactions
  );

router
  .route('/:organisation_id/beneficiaries/:beneficiary_id')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    BeneficiaryValidator.BeneficiaryExists,
    OrganisationController.getOrganisationBeneficiaryDetails
  );

router.get('/');
router
  .route(
    '/:organisation_id/vendors',
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getDonorVendors
  )
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getOrganisationVendors
  )
  .post(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    VendorValidator.createVendorRules(),
    VendorValidator.validate,
    VendorValidator.VendorStoreExists,
    CommonValidator.checkEmailNotTaken,
    CommonValidator.checkPhoneNotTaken,
    OrganisationController.createVendor
  );

router
  .route('/:organisation_id/vendors/transactions')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.vendorsTransactions
  );

router
  .route('/:organisation_id/vendors/summary')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getVendorsSummary
  );

router
  .route('/:organisation_id/vendors/:vendor_id')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.VendorId,
    VendorValidator.VendorExists,
    OrganisationController.getVendorDetails
  );

router
  .route('/:organisation_id/campaigns')
  .get(
    ParamValidator.OrganisationId,
    OrganisationValidator.organisationExists,
    OrganisationController.getAvailableOrgCampaigns
  )
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignTitleExists,
    CampaignValidator.createCampaignRules(),
    CampaignValidator.validate,
    OrganisationController.createCampaign
  );

router
  .route('/:organisation_id/campaigns/all')
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getAllOrgCampaigns
  );
router.post(
  '/group-beneficiaries',
  FieldAgentAuth,
  UsersController.groupAccount
);
router
  .route('/donations/private_donor/campaigns/all')
  .get(DonorAuth, OrganisationController.getAllPrivateDonorCampaigns);

router.get(
  '/donations/public_donor/campaigns/all',
  OrganisationController.getAllPublicDonorCampaigns
);
router.get('/public-ngos', OrganisationController.getAllNGOs);
router
  .route('/:organisation_id/cash4works')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getAllOrgCash4W
  );

router
  .route('/:organisation_id/private/campaigns/:campaign_id')
  .get(
    DonorAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.getPrivateCampaign
  );

router.get(
  '/:organisation_id/public-campaigns/:campaign_id',
  ParamValidator.OrganisationId,
  CampaignValidator.campaignBelongsToOrganisation,
  CampaignController.getCampaign
);
router
  .route('/:organisation_id/campaigns/:campaign_id')
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.getCampaign
  )
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignValidator.updateCampaignRules(),
    CampaignValidator.validate,
    OrganisationController.updateOrgCampaign
  )
  .patch(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignValidator.updateCampaignRules(),
    CampaignValidator.validate,
    CampaignController.toggleCampaign
  );

router
  .route('/:organisation_id/campaigns/:campaign_id/fund')
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.approveAndFundBeneficiaries
  );

router
  .route('/:organisation_id/campaigns/:campaign_id/fund-campaign')
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.approveAndFundCampaign
  );

router
  .route('/:organisation_id/campaigns/:campaign_id/fund-crypto-pay')
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    ParamValidator.CampaignId,
    CampaignController.fundCampaignWithCrypto
  );

router.get('/chain_currency', NgoSubAdminAuth, CampaignController.networkChain);
router
  .route('/:organisation_id/campaigns/:campaign_id/crypto_pay')
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.cryptoPayment
  );
router
  .route('/:organisation_id/campaign_form')
  .post(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignController.campaignForm
  )
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignController.getCampaignForm
  )
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignController.updateCampaignForm
  )
  .delete(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignController.destroyCampaignForm
  );
router
  .route('/:organisation_id/campaign_form/:form_id')
  .get(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignController.getSingleCampaignForm
  );
router
  .route('/:organisation_id/task/:campaign_id/fund_beneficiary')
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.fundApprovedBeneficiary
  );
router
  .route('/:organisation_id/:campaign_id/:token_type/tokens')
  .get(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.campaignTokens
  );

router
  .route('/pub_campaigns/:campaign_id/vendors')
  .get(ParamValidator.CampaignId, OrganisationController.getCampaignVendors);
router
  .route('/:organisation_id/campaigns/:campaign_id/vendors')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    OrganisationController.getCampaignVendors
  )

  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    VendorValidator.approveCampaignVendor,
    OrganisationController.approveCampaignVendor
  )
  .delete(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    VendorValidator.approveCampaignVendor,
    OrganisationController.removeCampaignVendor
  );
router.get(
  '/pub_campaigns/:campaign_id/beneficiary_location',
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesLocation
);

router.get(
  '/:organisation_id/campaigns/:campaign_id/beneficiary_location',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesLocation
);

router.get(
  '/pub_campaigns/:campaign_id/beneficiary_balance',
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesBalance
);

router.get(
  '/:organisation_id/campaigns/:campaign_id/beneficiary_balance',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesBalance
);
router.get(
  '/:organisation_id/campaigns/:campaign_id/beneficiary_transaction',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  OrganisationController.getVendorTransactionPerBene
);
router.get(
  '/pub_campaigns/:campaign_id/beneficiary_age',
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesAge
);
router.get(
  '/:organisation_id/campaigns/:campaign_id/beneficiary_age',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesAge
);
router.get(
  '/pub_campaigns/:campaign_id/beneficiary_mstatus',
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesMStatus
);
router.get(
  '/:organisation_id/campaigns/:campaign_id/beneficiary_mstatus',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  OrganisationController.getCampaignBeneficiariesMStatus
);
router
  .route('/pub_campaigns/:campaign_id/beneficiaries')
  .get(
    ParamValidator.CampaignId,
    OrganisationController.getCampaignBeneficiaries
  );
router
  .route('/:organisation_id/campaigns/:campaign_id/beneficiaries')
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    OrganisationController.getCampaignBeneficiaries
  )
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    BeneficiaryValidator.ApprovedBeneficiary,
    BeneficiaryValidator.IsCampaignBeneficiary,
    OrganisationController.updaeCampaignBeneficiary
  );

router
  .route('/:organisation_id/campaigns/:campaign_id/beneficiaries/approve')
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    OrganisationController.approvedAllbeneficiaries
  );
router
  .route('/:organisation_id/campaigns/:campaign_id/beneficiaries/reject')
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    OrganisationController.rejectAllbeneficiaries
  );
router
  .route('/products/:vendor_id')
  .get(OrganisationController.getProductVendors);

router
  .route('/:organisation_id/campaigns/:campaign_id/products')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    OrganisationController.getCampaignProducts
  )
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    ProductValidator.addProductRules,
    OrganisationController.addCampaignProduct
  );
router.post(
  '/product/:organisation_id/:campaign_id/destroy',
  NgoAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  CampaignValidator.campaignBelongsToOrganisation,
  OrganisationController.DeleteCampaignProduct
);

router.post(
  '/product/:organisation_id/:campaign_id/update',
  NgoAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  CampaignValidator.campaignBelongsToOrganisation,
  OrganisationController.UpdateCampaignProduct
);

router
  .route('/pub_campaigns/:campaign_id/complaints')
  .get(ParamValidator.CampaignId, ComplaintController.getPubCampaignConplaints);

router
  .route('/:organisation_id/campaigns/:campaign_id/complaints')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaints
  );

router
  .route('/pub_campaigns/:campaign_id/complaints/:complaint_id')
  .get(
    ParamValidator.CampaignId,
    ComplaintValidator.complaintBelongsToCampaign,
    ComplaintController.getCampaignConplaint
  );
router
  .route('/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaint
  );
router.patch(
  '/pub_campaigns/:campaign_id/complaints/:complaint_id/resolve',
  ParamValidator.CampaignId,
  ComplaintValidator.complaintBelongsToCampaign,
  ComplaintController.resolveCampaignConplaint
);
router.patch(
  '/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id/resolve',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  CampaignValidator.campaignBelongsToOrganisation,
  ComplaintValidator.complaintBelongsToCampaign,
  ComplaintController.resolveCampaignConplaint
);

module.exports = router;
