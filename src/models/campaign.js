'use strict';
const {Model} = require('sequelize');
const {userConst} = require('../constants');
const {INTEGER} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Campaign extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      Campaign.belongsToMany(models.User, {
        as: 'Beneficiaries',
        foreignKey: 'CampaignId',
        through: models.Beneficiary,
        constraints: false
      });
      Campaign.hasMany(models.Wallet, {
        as: 'BeneficiariesWallets',
        foreignKey: 'CampaignId',
        scope: {
          wallet_type: 'user'
        }
      });
      Campaign.hasMany(models.CampaignHistory, {
        as: 'history',
        foreignKey: 'campaign_id'
      });
      Campaign.hasOne(models.Wallet, {
        as: 'Wallet',
        foreignKey: 'CampaignId',
        scope: {
          wallet_type: 'organisation'
        }
      });
      Campaign.hasMany(models.Task, {
        as: 'Jobs'
      });
      Campaign.hasMany(models.Complaint, {
        as: 'Complaints',
        foreignKey: 'CampaignId'
      });
      Campaign.belongsTo(models.Organisation, {
        foreignKey: 'OrganisationId',
        as: 'Organisation'
      });
      // Campaign.belongsTo(models.Transaction, {
      //   foreignKey: 'CampaignId',
      //   as: 'TransactionCampaign'
      // });

      Campaign.belongsTo(models.CampaignForm, {
        foreignKey: 'formId',
        as: 'campaign_form'
      });

      Campaign.hasMany(models.Product, {
        as: 'CampaignProducts'
      });

      Campaign.hasMany(models.User, {
        as: 'CampaignVendors',
        foreignKey: 'vendor_id'
      });

      Campaign.hasMany(models.VoucherToken, {
        foreignKey: 'beneficiaryId',
        as: 'CampaignTokens'
      });
    }
  }

  Campaign.init(
    {
      OrganisationId: DataTypes.INTEGER,
      formId: DataTypes.INTEGER,
      title: DataTypes.STRING,
      minting_limit: DataTypes.INTEGER,
      is_processing: DataTypes.BOOLEAN,
      type: DataTypes.ENUM('campaign', 'cash-for-work', 'item'),
      spending: DataTypes.STRING,
      collection_hash: DataTypes.STRING,
      escrow_hash: DataTypes.STRING,
      description: DataTypes.TEXT,
      status: DataTypes.ENUM(
        'pending',
        'ongoing',
        'active',
        'paused',
        'completed',
        'ended'
      ),
      is_funded: DataTypes.BOOLEAN,
      is_public: DataTypes.BOOLEAN,
      funded_with: DataTypes.STRING,
      budget: DataTypes.FLOAT,
      contractIndex: DataTypes.INTEGER,
      amount_disbursed: DataTypes.FLOAT,
      location: DataTypes.STRING,
      start_date: DataTypes.DATE,
      paused_date: DataTypes.DATE,
      end_date: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'Campaign'
    }
  );
  return Campaign;
};
