'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderProduct extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      OrderProduct.belongsTo(models.Product, { as: 'Product', foreignKey: 'ProductId' })
      OrderProduct.belongsTo(models.Order, { as: 'Order', foreignKey: 'OrderId' })
    }
  };
  OrderProduct.init({
    OrderId: DataTypes.INTEGER,
    ProductId: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    unit_price: DataTypes.FLOAT,
    total_amount: DataTypes.FLOAT,
  }, {
    sequelize,
    modelName: 'OrderProduct',
  });
  return OrderProduct;
};