const {
  GodModeAuth,
  BeneficiaryAuth,
  FieldAgentAuth,
  NgoSubAdminAuth,
  Auth,
  FieldAgentBeneficiaryAuth,
  VendorBeneficiaryAuth
} = require('../middleware');
const {
  AuthController,
  BeneficiaryController,
  CampaignController,
  OrderController
} = require('../controllers');

const {
  CommonValidator,
  BeneficiaryValidator,
  ComplaintValidator,
  CampaignValidator
} = require('../validators');
const router = require('express').Router();

const CashForWorkController = require('../controllers/CashForWorkController');

router.get(
  '/cash-for-work/tasks',
  Auth,
  CashForWorkController.viewCashForWorkRefractor
);
router.get(
  '/field-app/cash-for-work/tasks/:beneficiaryId',
  FieldAgentBeneficiaryAuth,
  CashForWorkController.viewCashForWorkRefractorFieldApp
);
router.post(
  '/cash-for-work/tasks',
  FieldAgentBeneficiaryAuth,
  CashForWorkController.pickTaskFromCampaign
);
router.get('/cash-for-work/task/:taskId', CashForWorkController.viewTaskById);
router.get(
  '/field-app/cash-for-work/:campaignId',
  FieldAgentBeneficiaryAuth,
  CashForWorkController.getAllCashForWorkTaskFieldAgent
);
router.get(
  '/cash-for-work/:campaignId',
  FieldAgentBeneficiaryAuth,
  CashForWorkController.getAllCashForWorkTask
);
router.post(
  '/:campaignId/pay-for-product-service/:vendorId/:productId',
  BeneficiaryAuth,
  BeneficiaryController.BeneficiaryPayForProduct
);

router.get(
  '/gender',
  NgoSubAdminAuth,
  BeneficiaryController.beneficiariesByGender
);
router.get(
  '/age_group',
  NgoSubAdminAuth,
  BeneficiaryController.beneficiariesByAgeGroup
);
router.get(
  '/campaign/age_group',
  NgoSubAdminAuth,
  BeneficiaryController.beneficiariesByAgeGroup
);
router.get(
  '/location',
  NgoSubAdminAuth,
  BeneficiaryController.beneficiariesByLocation
);

router
  .route('/campaign/forms')
  .post(BeneficiaryAuth, CampaignController.submitCampaignForm);
router.get(
  '/marital_status',
  NgoSubAdminAuth,
  BeneficiaryController.beneficiariesByMaritalStatus
);
router.get(
  '/chart/:period',
  BeneficiaryAuth,
  BeneficiaryController.beneficiaryChart
);

router.get(
  '/total_balance',
  NgoSubAdminAuth,
  BeneficiaryController.beneficiariesTotalBalance
);

router.get('/', BeneficiaryController.getAllUsers);
router.delete('/:id', BeneficiaryController.deleteUser);
router.post('/add-account', BeneficiaryController.addAccount);
router.post('/register', BeneficiaryController.createUser);
router.post('/complaint', BeneficiaryController.createComplaint);
router.put('/complaint/resolve', BeneficiaryController.resolveComplaint);
router.get(
  '/complaints/:beneficiary',
  BeneficiaryController.getComplaintsByBeneficiary
);
router.get(
  '/user/beneficiary/:beneficiary',
  BeneficiaryController.getBeneficiaryUserWallet
);
router.get(
  '/user-details/:beneficiary',
  BeneficiaryController.getBeneficiaryUser
);

router.route('/profile').get(BeneficiaryAuth, BeneficiaryController.getProfile);

router.route('/:id').delete(GodModeAuth, BeneficiaryController.deleteUser);

router.get('/wallets', BeneficiaryAuth, BeneficiaryController.getWallets);

// Refactored
router.post(
  '/auth/register',
  BeneficiaryValidator.validateSelfRegister,
  CommonValidator.checkEmailNotTaken,
  CommonValidator.checkPhoneNotTaken,
  AuthController.beneficiaryRegisterSelf
);
router
  .route('/survey/:campaign_id')
  .get(
    FieldAgentBeneficiaryAuth,
    CampaignValidator.campaignExists,
    BeneficiaryController.getCampaignQuestion
  )
  .post(
    BeneficiaryAuth,
    CampaignValidator.campaignExists,
    BeneficiaryController.submitQuestion
  );

router
  .route('/field/survey/:campaign_id')
  .post(
    FieldAgentAuth,
    CampaignValidator.campaignExists,
    BeneficiaryController.submitQuestionFieldAgent
  );
router.post(
  '/transfer/beneficiary',
  BeneficiaryAuth,

  BeneficiaryController.transfer
);
router
  .route('/campaigns')
  .get(BeneficiaryAuth, CampaignController.getBeneficiaryCampaigns);
router.post(
  '/campaigns/:campaign_id/join',
  FieldAgentBeneficiaryAuth,
  BeneficiaryValidator.NotCampaignBeneficiary,
  BeneficiaryController.joinCampaign
);

router.post(
  '/:beneficiary_id/campaigns/:campaign_id/join',
  FieldAgentAuth,
  BeneficiaryValidator.NotCampaignBeneficiary,
  BeneficiaryController.joinCampaignField
);

router.post(
  '/:beneficiary_id/campaigns/:campaign_id/join',
  FieldAgentAuth,
  BeneficiaryValidator.NotCampaignBeneficiary,
  BeneficiaryController.joinCampaignField
);

router.put(
  '/campaigns/:campaign_id/leave',
  BeneficiaryAuth,
  BeneficiaryValidator.IsCampaignBeneficiary,
  BeneficiaryController.leaveCampaign
);

router
  .route('/campaigns/:campaign_id/complaints')
  .get(
    BeneficiaryAuth,
    BeneficiaryValidator.IsCampaignBeneficiary,
    CampaignController.getBeneficiaryCampaignComplaint
  )
  .post(
    BeneficiaryAuth,
    BeneficiaryValidator.IsCampaignBeneficiary,
    ComplaintValidator.addComplaintRules(),
    ComplaintValidator.validate,
    CampaignController.addBeneficiaryComplaint
  );

router.post(
  '/approve-spending',
  VendorBeneficiaryAuth,
  BeneficiaryValidator.IsCampaignBeneficiary,
  OrderController.approveBeneficiaryToSpend
);

module.exports = router;
