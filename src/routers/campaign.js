const router = require('express').Router();
const {CampaignController} = require('../controllers');
const {Auth} = require('../middleware');

router.route('/').get(Auth, CampaignController.getAllCampaigns);

router.get('/:id', Auth, CampaignController.getACampaign);
router.put('/:id', Auth, CampaignController.updatedCampaign);
router.post('/:id', Auth, CampaignController.deleteCampaign);
// router.post("/fund-beneficiaries-wallets", Auth, CampaignController.fundWallets);
router.post(
  '/onboard-beneficiaries/:campaignId',
  Auth,
  CampaignController.beneficiariesToCampaign
);
router.get('/complaints/:campaignId', Auth, CampaignController.complaints);

module.exports = router;
