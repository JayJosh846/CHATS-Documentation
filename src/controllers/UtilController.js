const {Response} = require('../libs');
const {UtilService, PaystackService} = require('../services');
const {HttpStatusCode, SanitizeObject} = require('../utils');
const {CurrencyServices} = require('../services');

class UtilController {
  static async getCountries(req, res) {
    try {
      const countries = UtilService.allCountryData();
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Countries data.',
        countries
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getBanks(req, res) {
    try {
      const query = SanitizeObject(req.query, [
        ['perPage', 'page', 'type', 'currency', 'country']
      ]);

      if (!query.country) query.country = 'nigeria';
      if (!query.perPage) query.perPage = 100;
      if (!query.currency) query.currency = 'NGN';

      const banks = await PaystackService.listBanks(query);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Banks', banks);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async resolveAccountNumber(req, res) {
    try {
      const {account_number, bank_code} = SanitizeObject(req.query, [
        'account_number',
        'bank_code'
      ]);
      const response = await PaystackService.resolveAccount(
        account_number,
        bank_code
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Banks', response);
      return Response.send(res);
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, error.message);
      return Response.send(res);
    }
  }
  static async getexchangeRates(req, res) {
    const currenciesObj = CurrencyServices;
    Response.setSuccess(
      HttpStatusCode.STATUS_OK,
      'Exchange Rate',
      currenciesObj.exchangeData
    );
    return Response.send(res);
  }
  static async convertCurrency(req, res) {
    const {amount, from, to} = req.body;
    const newAmount = await CurrencyServices.convertCurrency(amount, from, to);

    console.log(newAmount);
    Response.setSuccess(HttpStatusCode.STATUS_OK, 'Exchange Rate', newAmount);
  }
}

module.exports = UtilController;
