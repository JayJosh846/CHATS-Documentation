module.exports = {
  secretKey: process.env.PAYSTACK_SEC_KEY || "",
  publickKey: process.env.PAYSTACK_PUB_KEY || "",
  channels: ['card', 'bank', 'ussd', 'qr', 'bank_transfer'],
  defaultCurrency: 'NGN',
  currencies: ['NGN']
};