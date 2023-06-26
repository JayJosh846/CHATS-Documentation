'use strict';

const { Model } = require('sequelize');
const sequelizePaginate = require('sequelize-paginate');
module.exports = (sequelize, DataTypes) => {
  class Complaint extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Complaint.belongsTo(models.User, { foreignKey: 'UserId', as: 'Beneficiary' })
      Complaint.belongsTo(models.Campaign, { foreignKey: 'CampaignId', as: 'Campaign' })
    }
  };
  Complaint.init({
    
    report: DataTypes.TEXT,
    status: DataTypes.ENUM('resolved', 'unresolved'),
    CampaignId: DataTypes.INTEGER,
    UserId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Complaint',
  });
  sequelizePaginate.paginate(Complaint)
  return Complaint;
};
