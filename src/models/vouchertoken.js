'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class VoucherToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      VoucherToken.belongsTo(models.User,{foreignKey: 'beneficiaryId', as: "UserToken"})
      VoucherToken.belongsTo(models.Campaign,{foreignKey: 'campaignId', as: "BeneficiaryTokens"})
    }
  };
  VoucherToken.init({
    beneficiaryId: DataTypes.INTEGER,
    campaignId: DataTypes.INTEGER,
    organisationId: DataTypes.INTEGER,
    tokenType: DataTypes.ENUM('smstoken', 'papertoken'),
    token: DataTypes.TEXT,
    amount: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'VoucherToken',
  });
  return VoucherToken;
};