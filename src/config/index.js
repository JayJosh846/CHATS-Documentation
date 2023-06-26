const databaseConfig = require('./database');
const paystackConfig = require('./paystack');
const rabbitmqConfig = require('./rabbitmq');
const tokenConfig = require('./token');
const bantuConfig = require('./bantu');
const awsConfig = require('./aws');
const termiiConfig = require('./termii');
const mailerConfig = require('./mailer');
const zohoCrmConfig = require('./zohocrm');
const switchWallet = require('./switchwallet')

module.exports = {
  switchWallet,
  databaseConfig,
  paystackConfig,
  rabbitmqConfig,
  termiiConfig,
  mailerConfig,
  tokenConfig,
  bantuConfig,
  awsConfig,
  zohoCrmConfig
}