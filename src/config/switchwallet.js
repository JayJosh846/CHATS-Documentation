require('dotenv').config();

module.exports = {
  baseURL: process.env.SWITCH_WALLET_BASE_URL,
  secretKey: process.env.SWITCH_WALLET_SECRETE_KEY || '',
  publicKey: process.env.SWITCH_WALLET_PUBLIC_KEY,
  email: process.env.SWITCH_WALLET_EMAIL,
  password: process.env.SWITCH_WALLET_PASSWORD
}
