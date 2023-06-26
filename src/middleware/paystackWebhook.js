const crypto = require('crypto');
const {paystackConfig} = require('../config');
const PaystackWebhookGuard = (req, res, next) => {
  const body = req.body;

  const signature = req.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', paystackConfig.secretKey)
    .update(JSON.stringify(body))
    .digest('hex');
  if (hash == signature) {
    next();
    return;
  }
  res.sendStatus(400);
};

exports.PaystackWebhookGuard = PaystackWebhookGuard;
