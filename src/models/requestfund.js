'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RequestFund extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      RequestFund.hasOne(models.Campaign, {
        foreignKey: 'id',
        as: 'campaign'
      });
    }
  }
  RequestFund.init(
    {
      donor_organisation_id: DataTypes.INTEGER,
      campaign_id: DataTypes.INTEGER,
      reason: DataTypes.STRING,
      status: DataTypes.ENUM('Pending', 'Approved', 'Rejected')
    },
    {
      sequelize,
      modelName: 'RequestFund'
    }
  );
  return RequestFund;
};
