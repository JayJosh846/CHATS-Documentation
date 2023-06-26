'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Subscription.belongsTo(models.Plan, {
        foreignKey: 'PlanId',
        as: 'Plan'
      });
      Subscription.belongsTo(models.Organisation, {
        foreignKey: 'OrganisationId',
        as: 'Organisation'
      });
    }
  }
  Subscription.init(
    {
      isActive: DataTypes.BOOLEAN,
      planId: DataTypes.INTEGER,
      organisationId: DataTypes.INTEGER,
      status: DataTypes.STRING,
      amount: DataTypes.FLOAT,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'Subscription'
    }
  );
  return Subscription;
};
