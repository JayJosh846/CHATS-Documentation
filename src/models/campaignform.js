'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CampaignForm extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CampaignForm.hasMany(models.Campaign, {
        foreignKey: 'formId',
        as: 'campaigns'
      });
    }
  }
  CampaignForm.init(
    {
      beneficiaryId: DataTypes.INTEGER,
      organisationId: DataTypes.INTEGER,
      title: DataTypes.STRING,
      questions: DataTypes.JSON
    },
    {
      sequelize,
      modelName: 'CampaignForm'
    }
  );
  return CampaignForm;
};
