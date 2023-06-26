const router = require('express').Router();

const {FileValidator, TaskValidator} = require('../validators');

const {
  VendorAuth,
  FieldAgentAuth,
  BeneficiaryAuth,
  NgoSubAdminAuth,
  FieldAgentBeneficiaryAuth
} = require('../middleware');
const CashForWorkController = require('../controllers/CashForWorkController');
const CampaignController = require('../controllers/CampaignController');

// router.use(Auth);
router.post('/evidence', CashForWorkController.evidence);

router.get(
  '/:task_id/evidence/:user_id',
  NgoSubAdminAuth,
  CashForWorkController.viewSubmittedEvidence
);
router.post(
  '/task/task-approved-vendor',
  VendorAuth,
  CashForWorkController.approveSubmissionVendor
);
router.post(
  '/task/task-approved-agent',
  FieldAgentAuth,
  CashForWorkController.approveSubmissionAgent
);

router.post(
  '/task/vendor-evidence',
  VendorAuth,
  FileValidator.checkTaskProgressEvidenceFile(),
  CashForWorkController.uploadProgreeEvidenceVendor
);
router.post(
  '/task/agent-evidence/:beneficiaryId',
  FieldAgentAuth,
  FileValidator.checkTaskProgressEvidenceFile(),
  CashForWorkController.uploadProgreeEvidenceFieldAgent
);
router.post(
  '/task/beneficiary-evidence',
  BeneficiaryAuth,
  FileValidator.checkTaskProgressEvidenceFile(),
  CashForWorkController.uploadProgreeEvidenceByBeneficiary
);
router.post(
  '/task/reject-submission/:taskAssignmentId',
  FieldAgentAuth,
  CampaignController.rejectSubmission
);
router.get('/', CashForWorkController.getAllCashForWork);
router.post('/newTask', CashForWorkController.newTask);
router.get('/:cashforworkid', CashForWorkController.getCashForWork);
router.get('/tasks/:campaignId', CashForWorkController.getTasks);
router.get('/task/:taskId', CashForWorkController.getTask);
router.post('/task/addWorkers', CashForWorkController.addWorkersToTask);
router.post('/task/submit-progress', CashForWorkController.submitProgress);
router.post('/task/progress/confirm', CashForWorkController.approveProgress);
router.post('/task/pay-wages', CashForWorkController.payWages);

module.exports = router;
