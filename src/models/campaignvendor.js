'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CampaignVendor extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CampaignVendor.belongsTo(models.User, { foreignKey: 'VendorId', as: 'Vendor' });
      CampaignVendor.belongsTo(models.Campaign, { foreignKey: 'CampaignId', as: 'Campaign' });
      CampaignVendor.hasMany(models.Product, { foreignKey: 'CampaignId', as: 'CampaignVendors' });
    }
  };
  CampaignVendor.init({
    VendorId: DataTypes.NUMERIC,
    CampaignId: DataTypes.NUMERIC,
    approved: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'CampaignVendor',
  });
  return CampaignVendor;
};