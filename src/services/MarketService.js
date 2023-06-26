const {AclRoles} = require('../utils');
const {
  Market,
  Product,
  OrderProduct,
  Beneficiary,
  Organisation,
  Campaign,
  Order,
  User,
} = require('../models');
const {Op, Sequelize} = require('sequelize');
const {userConst} = require('../constants');

class MarketService {
  static findPurchasedProductByGender(gender) {
    return Organisation.findAll({
      include: [
        {
          model: User,
          as: 'Vendors',

          include: [
            {
              model: Market,
              as: 'Store',

              include: [
                {
                  model: Product,
                  as: 'Products',

                  include: [
                    {
                      model: OrderProduct,
                      as: 'Product',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }
}

module.exports = MarketService;
