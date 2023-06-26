const router = require('express').Router();

const {
  Auth,
  NgoAdminAuth,
  IsOrgMember,
  IsRecaptchaVerified
} = require('../middleware'); //Auhorization middleware

// const {AuthController, ImpactReportController} = require('../controllers');
const {
  AuthValidator,
  CampaignValidator,
  ParamValidator,
  FileValidator
} = require('../validators');
const {ImpactReportController} = require('../controllers');

router.post('/create-report/', Auth, ImpactReportController.createReport);

router.get('/all-reports', Auth, ImpactReportController.getAllReport);
router.get(
  '/reports/:campaignId',
  Auth,
  ImpactReportController.getReportByCampaignId
);

module.exports = router;
