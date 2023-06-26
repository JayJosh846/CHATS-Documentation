const {default: axios} = require('axios');
const {termiiConfig} = require('../config');

class SmsService {
  httpService;
  constructor() {
    this.httpService = axios.create({
      baseURL: termiiConfig.baseUrl
    });
  }

  async sendMessage(recipients, message) {
    const _recipients = Array.isArray(recipients) ? recipients : [recipients];
    const to = this._prunRecipients(_recipients);
    return this.send(to, message);
  }

  async sendOtp(recipients, message) {
    const _recipients = Array.isArray(recipients) ? recipients : [recipients];
    const to = this._prunRecipients(_recipients);
    return this.send(to, message);
  }

  async send(to, sms, channel = 'dnd') {
    const data = this._loadData({to, sms, channel});
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.httpService.post('/sms/send', data);
        console.log('sms sent');
        resolve(response.data);
      } catch (error) {
        console.log('sms error' + error);
        reject(error);
      }
    });
  }

  _loadData(extra = {}) {
    const {from, api_key} = this._loadConfig();

    return {
      type: 'plain',
      channel: 'dnd',
      from,
      api_key,
      ...extra
    };
  }

  _loadConfig() {
    return termiiConfig;
  }

  _prunRecipients(recipients = []) {
    return recipients.map(phone => phone.replace(/[^0-9]/g, ''));
  }

  async sendAdminSmsCredit(to, amount) {
    const {from, api_key} = this._loadConfig();
    const data = {
      to: [to, '2348026640451'],
      from: from,
      sms: `This is to inform you that your SMS service balance is running low. Current balance is ${amount}. Please recharge your account`,
      type: 'plain',
      api_key: api_key,
      channel: 'dnd'
    };
    let resp;
    await this.httpService
      .post('/sms/send/bulk', data)
      .then(result => {
        resp = result.data;
      })
      .catch(error => {
        console.log('error', error.message);
      });
    return resp;
  }

  async sendAdminNinCredit(to, amount) {
    const {from, api_key} = this._loadConfig();
    const data = {
      to: [to, '2348026640451'],
      from: from,
      sms: `This is to inform you that your NIN service balance is running low. Current balance is ${amount}. Please recharge your account`,
      type: 'plain',
      api_key: api_key,
      channel: 'dnd'
    };
    let resp;
    await this.httpService
      .post('/sms/send/bulk', data)
      .then(result => {
        resp = result.data;
      })
      .catch(error => {
        console.log('error', error.message);
      });
    return resp;
  }

  async sendAdminBlockchainCredit(to, amount) {
    const {from, api_key} = this._loadConfig();
    const data = {
      to: [to, '2348026640451'],
      from: from,
      sms: `This is to inform you that your Blockchain service balance that covers for gas is running low. Current balance is ${amount}. Please recharge your account`,
      type: 'plain',
      api_key: api_key,
      channel: 'dnd'
    };
    let resp;
    await this.httpService
      .post('/sms/send/bulk', data)
      .then(result => {
        resp = result.data;
      })
      .catch(error => {
        console.log('error', error.message);
      });
    return resp;
  }
}

module.exports = new SmsService();
