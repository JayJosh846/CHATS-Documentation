const request = require('request');
const https = require('https');
class Base {
  constructor(url = 'http://127.0.0.1/m-pay') {
    this.url = url;
    this.body = null;
  }
  /**
   * @param {string} url The called url
   * @param   {object} payload the delivery payload
   */
  async get(url, payload = {}, header) {
    try {
      const response = await request.get(url, payload, header);
      return response;
    } catch (error) {
      return error;
    }
  }

  /**
   *
   * @param {string} url the endpoint to call via axios
   * @param {object} payload The payload to send along
   */
  post(url, payload, headers) {
    return new Promise((resolve, reject) => {
      request
        .post(url, payload, headers)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}

module.exports = Base;
