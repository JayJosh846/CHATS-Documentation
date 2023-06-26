'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      //Product.belongsTo(models.Market, { foreignKey: 'MarketId', as: 'Store' });
      Product.belongsTo(models.Campaign, {
        foreignKey: 'CampaignId',
        as: 'Campaign'
      });
      Product.belongsToMany(models.User, {
        foreignKey: 'productId',
        as: 'ProductVendors',
        through: 'VendorProduct'
      });
      Product.belongsToMany(models.User, {
        foreignKey: 'productId',
        as: 'ProductBeneficiaries',
        through: 'ProductBeneficiary'
      });

      //Product.hasMany(models.OrderProduct, { foreignKey: 'ProductId', as: 'Product' });
    }
  }
  Product.init(
    {
      type: DataTypes.ENUM('product', 'service'),
      product_category: DataTypes.STRING,
      tag: DataTypes.STRING,
      cost: DataTypes.FLOAT,
      product_ref: DataTypes.STRING,
      //MarketId: DataTypes.INTEGER,
      CampaignId: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'Product'
    }
  );
  return Product;
};
