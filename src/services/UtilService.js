const {countries} = require('../constants');
class UtilService {
  static allCountryData() {
    return countries.map(({countryCode, countryName, currencyCode}) => ({
      countryCode,
      countryName,
      currencyCode,
    }));
  }
}

module.exports = UtilService;
