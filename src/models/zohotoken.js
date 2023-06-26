'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ZohoToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ZohoToken.init({
    access_token: DataTypes.STRING,
    refresh_token: DataTypes.STRING,
    expires_in: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ZohoToken',
  });
  return ZohoToken;
};