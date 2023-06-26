const {Response} = require('../libs');
const {ProductService, UserService} = require('../services');
const {HttpStatusCode, SanitizeObject} = require('../utils');
const db = require('../models');
class ProductController {
  static async getCampaignProduct(req, res) {
    try {
      const campaignId = req.params.campaign_id;
      const productId = req.params.productId;
      const products = await ProductService.findCampaignProduct(
        campaignId,
        productId,
      );

      const campaign = await db.Campaign.findOne({where: {id: campaignId}});
      products.dataValues.campaign_status = campaign.status;

      products.ProductVendors.forEach(vendor => {
        vendor.dataValues.VendorName =
          vendor.first_name + ' ' + vendor.last_name;
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Campaign Product.',
        products,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Unexpected error. Please retry.' + error,
      );
      return Response.send(res);
    }
  }
}

module.exports = ProductController;
