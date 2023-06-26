const db = require('../db/models');
const Base = require('./Base');
const dotenv = require('dotenv');
const sha512 = require('js-sha512').sha512;
dotenv.config();
var request = require('request');

class Paystack {
  constructor() {}
  /**
   *
   * @param {string} transactionId The transaction Id to confirm on the paystack endpoint
   * @returns {object} returns object type
   */
  confirmDeposit(transactionId) {
    return new Promise((resolve, reject) => {
      const options = {
        url: 'https://api.paystack.co/transaction/verify/' + transactionId,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY_TEST,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }
  getBankList() {
    return new Promise((resolve, reject) => {
      const options = {
        url:
          'https://api.paystack.co/bank' ||
          'http://127.0.0.1/code-lab/banks.json',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY_TEST,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }
  /**
   *
   * @param {string} accountNumber Recipients account number
   * @param {string} bankCode Recipients Bank Code
   */
  resolveBankAccount(accountNumber, bankCode) {
    return new Promise((resolve, reject) => {
      const options = {
        url:
          'https://api.paystack.co/bank/resolve?account_number=' +
          accountNumber +
          '&bank_code=' +
          bankCode,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY_TEST,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }
  transferRecipients(
    accountNumber = '0164063227',
    bankCode = '058',
    name = 'Habeeb Salami Alabi',
  ) {
    return new Promise((resolve, reject) => {
      const payload = {
        type: 'nuban',
        name: name,
        description: 'Testing Transfer Endpoint',
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      };
      const options = {
        url: 'https://api.paystack.co/transferrecipient/',
        method: 'POST',
        body: payload,
        json: true,
        headers: {
          Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY_TEST,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }
  transferToBank(amount, recipientCode) {
    return new Promise((resolve, reject) => {
      const payload = {
        source: 'balance',
        reason: 'Transfer To Customer Account',
        amount: amount,
        recipient: recipientCode,
        reference: Date(),
      };
      const options = {
        url: 'https://api.paystack.co/transfer',
        method: 'POST',
        body: payload,
        json: true,
        headers: {
          Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY_TEST,
        },
      };
      request(options, (err, res, body) => {
        if (body) resolve(body);
        else reject(err);
      });
    });
  }
}

module.exports = new Paystack();
