'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AssociatedCampaign extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  AssociatedCampaign.init(
    {
      DonorId: DataTypes.INTEGER,
      CampaignId: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'AssociatedCampaign'
    }
  );
  return AssociatedCampaign;
};
