const router = require('express').Router();
const {WebhookController} = require('../controllers');
const {PaystackWebhookGuard} = require('../middleware');
const {ParamValidator} = require('../validators');

router.post(
  '/paystack/deposit',
  PaystackWebhookGuard,
  WebhookController.verifyPaystackDeposit
);

router.put('/switch-wallet/deposit', WebhookController.verifyWalletDeposit);

router.post(
  '/paystack/:campaign_id/deposit',
  ParamValidator.CampaignId,
  PaystackWebhookGuard,
  WebhookController.verifyPaystackCampaignDeposit
);

module.exports = router;
