'use strict';
const {
  Model
} = require('sequelize');
const db = require("./index")
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Order.hasOne(models.Transaction, {
        as: 'Transaction',
        foreignKey: 'OrderId',
      });
      Order.hasMany(models.OrderProduct, {
        as: 'Cart',
        foreignKey: 'OrderId'
      })
      Order.belongsToMany(models.Product, {
        as: 'Products',
        through: models.OrderProduct
      })
      Order.belongsTo(models.User, {
        as: 'Vendor',
        foreignKey: 'VendorId'
      })
    }
  };
  Order.init({
    reference: DataTypes.STRING,
    VendorId: DataTypes.INTEGER,
    CampaignId: DataTypes.INTEGER,
    status: DataTypes.ENUM('pending', 'processing', 'confirmed', 'delivered', 'failed'),
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};