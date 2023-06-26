const router = require('express').Router();
const {
  CampaignValidator,
  FileValidator,
  TaskValidator,
} = require('../validators');
const {NgoSubAdminAuth, IsOrgMember} = require('../middleware');
const TaskController = require('../controllers/TaskController');
router.post(
  '/amend-cash-for-work/task/:taskId',
  NgoSubAdminAuth,
  TaskController.amendTask,
);

router.post(
  '/task_progress_evidence/:taskProgressId',
  NgoSubAdminAuth,
  IsOrgMember,
  TaskValidator.taskProgressId(),
  FileValidator.checkTaskProgressFile(),
  TaskController.uploadEvidence,
);
router.route('/cash-for-work/task/:task_id').get(
  // NgoSubAdminAuth,
  // TaskValidator.taskId(),
  TaskController.getTaskBeneficiaies,
);

router
  .route('/:organisation_id/:campaign_id')
  .get(TaskController.getCashForWorkTasks)
  .post(
    NgoSubAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    TaskValidator.createCashForWorkTaskRule(),
    TaskValidator.validate,
    TaskController.createCashForWorkTask,
  );

router.put(
  '/:organisation_id/:campaign_id/:task_id',
  NgoSubAdminAuth,
  IsOrgMember,
  CampaignValidator.campaignBelongsToOrganisation,
  TaskValidator.updateCashForWorkTaskRule(),
  TaskValidator.validate,
  TaskController.updateTask,
);

module.exports = router;
