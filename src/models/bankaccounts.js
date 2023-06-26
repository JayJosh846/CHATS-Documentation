'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BankAccount extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BankAccount.belongsTo(models.User,{foreignKey: 'UserId', as: "AccountHolder", })
      // define association here
    }
  };
  BankAccount.init({
    UserId: DataTypes.STRING,
    account_number: DataTypes.INTEGER,
    account_name: DataTypes.STRING,
    bank_code: DataTypes.STRING,
    bank_name: DataTypes.STRING,
    recipient_code: DataTypes.STRING,
    type: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'BankAccount',
  });
  return BankAccount;
};