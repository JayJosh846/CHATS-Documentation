'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Plan.hasMany(models.Subscription, {
        as: 'Subscriptions',
        foreignKey: 'SubscriptionId'
      });
    }
  }
  Plan.init(
    {
      name: DataTypes.STRING,
      conditional_voucher_number: DataTypes.NUMBER,
      is_unlimited_conditional_voucher: DataTypes.BOOLEAN,
      beneficiaries_number: DataTypes.NUMBER,
      is_unlimited_beneficiaries: DataTypes.BOOLEAN,
      plan_cost: DataTypes.FLOAT,
      campaign_cost_cap: DataTypes.FLOAT,
      is_unlimited_campaign_cost: DataTypes.BOOLEAN,
      unconditional_voucher_number: DataTypes.NUMBER,
      is_unlimited_unconditional_voucher: DataTypes.BOOLEAN,
      beneficiaries_onboarding: DataTypes.ENUM(
        'FIELD AGENTS',
        'SELF ONBOARDING'
      ),
      features: DataTypes.JSON,
      isActive: DataTypes.BOOLEAN
    },
    {
      sequelize,
      modelName: 'Plan'
    }
  );
  return Plan;
};
