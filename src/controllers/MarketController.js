const {User} = require('../models');
const {Response} = require('../libs');
const {MarketService} = require('../services');
const {HttpStatusCode, SanitizeObject} = require('../utils');

class MarketController {
  static async getAllProductPurchasedByGender(req, res) {
    const {gender} = req.body;
    try {
      const productPurchased = await MarketService.findPurchasedProductByGender();
      if (productPurchased.length > 0) {
        Response.setSuccess(200, 'Products retrieved', productPurchased);
      } else {
        Response.setSuccess(200, 'No Product found');
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        `Internal server error. Contact support....` + error,
      );
      return Response.send(res);
    }
  }
}

module.exports = MarketController;
