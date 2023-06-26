require('dotenv').config();

module.exports = {
  baseUrl: process.env.TERMII_BASE_URL,
  from: process.env.TERMII_SMS_FROM,
  api_key: process.env.TERMII_API_KEY,
  api_secret: process.env.TERMII_API_SECRET
}