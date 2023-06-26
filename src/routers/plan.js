const router = require('express').Router();

const {SuperAdminAuth, IsOrgMember} = require('../middleware');

const {
  OrganisationValidator,
  ParamValidator,
  FileValidator,
  CampaignValidator
} = require('../validators');

const {PlanController} = require('../controllers');

router.post('/create-plan', SuperAdminAuth, PlanController.createPlan);
router.put('/update-plan:id', SuperAdminAuth, PlanController.updatePlan);
router.get('/plans', SuperAdminAuth, PlanController.getAllPlans);
router.delete('/:id', SuperAdminAuth, PlanController.deletePlan);

module.exports = router;
