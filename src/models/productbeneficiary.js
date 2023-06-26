'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProductBeneficiary extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  ProductBeneficiary.init({
    productId: DataTypes.INTEGER,
    UserId: DataTypes.INTEGER,
    OrganisationId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'ProductBeneficiary',
  });
  return ProductBeneficiary;
};