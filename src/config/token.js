require('dotenv').config();

module.exports = {
  baseURL:
    process.env.TOKEN_BASE_URL ||
    'https://staging-token.chats.cash/api/v1/web3',
  secret: process.env.TOKEN_SECRET || '',
  api: process.env.BLOCKCHAINSERV_TEST
};
