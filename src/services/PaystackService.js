const {paystackConfig} = require('../config');
const {FundAccount} = require('../models');
const {generatePaystackRef} = require('../utils');
const {Logger} = require('../libs');

const paystack = require('paystack-api')(paystackConfig.secretKey);

class PaystackService {
  static async buildDepositData(
    organisation,
    _amount,
    CampaignId,
    _currency = null
  ) {
    let dev_data = null;
    const amount = _amount * 100;
    const currency = _currency || paystackConfig.defaultCurrency;
    const ref = generatePaystackRef();

    if (process.env.NODE_ENV == 'development') {
      dev_data =
        (
          await paystack.transaction.initialize({
            reference: ref,
            amount,
            email: organisation.email
          })
        ).data || null;
    }

    FundAccount.create({
      channel: 'fiat',
      service: 'paystack',
      OrganisationId: organisation.id,
      CampaignId,
      amount: _amount,
      transactionReference: ref
    });

    return {
      ref,
      email: organisation.email,
      key: paystackConfig.publickKey,
      channels: paystackConfig.channels,
      currency,
      amount,

      metadata: {
        organisation_id: organisation.id
      },
      ...(dev_data && {
        dev_data
      })
    };
  }

  static async verifyDeposit(reference) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await paystack.transaction.verify(reference);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async withdraw(source, amount, recipient, reason) {
    return new Promise(async (resolve, reject) => {
      try {
        let value = amount * 100;
        Logger.info(`Transferring Funds to Bank Account`);
        const response = await paystack.transfer.create({
          source,
          amount: value,
          recipient,
          reason
        });
        Logger.info(`Funds Transferred to Bank Account`);
        resolve(response);
      } catch (error) {
        Logger.error(`Error Transferring Funds to Bank account: ${error}`);
        reject(error);
      }
    });
  }

  static async resolveAccount(account_number, bank_code) {
    return new Promise(async (resolve, reject) => {
      try {
        const resoponse = await paystack.verification.resolveAccount({
          account_number,
          bank_code
        });
        if (!resoponse.status) throw new Error('Request failed.');
        resolve(resoponse.data);
      } catch (error) {
        reject(new Error('Could not resolve account. Check details.'));
      }
    });
  }

  static async listBanks(query = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await paystack.misc.list_banks(query);
        const banks = response.data.map(bank => ({
          name: bank.name,
          country: bank.country,
          currency: bank.currency,
          code: bank.code
        }));
        resolve(banks);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async createRecipientReference(name, account_number, bank_code) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await paystack.transfer_recipient.create({
          type: 'nuban',
          name,
          account_number,
          bank_code
        });
        if (!response.status) throw new Error('Request failed.');
        resolve(response.data);
      } catch (error) {
        reject(new Error('Recipient creation failed.'));
      }
    });
  }
}

module.exports = PaystackService;
