require('dotenv').config();
const {default: axios} = require('axios');

class CurrencyServices {
  httpService;
  appId;
  exchangeData;
  constructor() {
    // this.httpService = 'https://openexchangerates.org/api';
    // this.appId = process.env.OPEN_EXCHANGE_APP;
    this.exchangeData = this.getExchangeRate();
  }

  async getExchangeRate() {
    return await this.getExchangeRate();
  }
  async getExchangeRate() {
    // const appId = process.env.OPEN_EXCHANGE_APP;
    // console.log(appId);
    const url = `https://openexchangerates.org/api/latest.json?app_id=da41a176c0874c4498594d728d2aa4ca`;
    const exchange = await axios.get(url);
    this.exchangeData = exchange.data.rates;
    return this.exchangeData;
  }

  async convertCurrency(fromCurrency, toCurrency, amount) {
    const data = await this.getExchangeRate();
    const currencies = Object.entries(data);
    // get rate of from origin currency
    const fromRate = currencies.find(row => {
      return row[0] == fromCurrency;
    });
    // get rate of to destination currency
    const toRate = currencies.find(row => {
      return row[0] == toCurrency;
    });
    // console.log('fromRate: ', toRate);
    // console.log(toRate);
    // console.log('toRate: ', fromRate);
    // console.log(fromRate);
    return await this.convertRate(fromRate[1], toRate[1], amount);
  }
  async convertRate(fromRate, toRate, amount) {
    // console.log('fromRate: ', fromRate);
    // console.log('toRate: ', toRate);
    // console.log('amount: ', amount);
    const result = (toRate / fromRate) * amount;
    // console.log('result: ', result.toFixed(2));
    return result;
  }
}

module.exports = new CurrencyServices();
