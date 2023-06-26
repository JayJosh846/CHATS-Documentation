const {Response} = require('../libs');
const {SmsService} = require('../services');
const {HttpStatusCode} = require('../utils');
class AppController {
  static async testSms(req, res) {
    try {
      const phone = req.params.phone.trim();
      const message = 'Yeey... Tester, we are up!';
      const response = await SmsService.sendOtp(phone, message);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Result', response);
      return Response.send(res);
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Test Error', error);
      return Response.send(res);
    }
  }
}

module.exports = AppController;
