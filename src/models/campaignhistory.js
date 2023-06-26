'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CampaignHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CampaignHistory.init(
    {
      extension_period: DataTypes.STRING,
      new_end_date: DataTypes.DATE,
      additional_budget: DataTypes.INTEGER,
      beneficiaries: DataTypes.INTEGER,
      campaign_id: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'CampaignHistory'
    }
  );
  return CampaignHistory;
};
