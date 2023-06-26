'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CampaignImpactReport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CampaignImpactReport.belongsTo(models.User, {
        foreignKey: 'AgentId',
        as: 'User'
      });
      CampaignImpactReport.belongsTo(models.Campaign, {
        foreignKey: 'CampaignId',
        as: 'Campaign'
      });
    }
  }
  CampaignImpactReport.init(
    {
      title: DataTypes.STRING,
      CampaignId: DataTypes.INTEGER,
      AgentId: DataTypes.INTEGER,
      MediaLink: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'CampaignImpactReport'
    }
  );
  return CampaignImpactReport;
};
