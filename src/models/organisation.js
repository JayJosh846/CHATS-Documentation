'use strict';
const {Model} = require('sequelize');
const {async} = require('regenerator-runtime');
const {AclRoles, OrgRoles} = require('../utils');
module.exports = (sequelize, DataTypes) => {
  class Organisation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Organisation.belongsToMany(models.User, {
        as: 'Vendors',
        through: {
          model: models.OrganisationMembers,
          scope: {
            role: OrgRoles.Vendor
          }
        }
      });

      Organisation.hasMany(models.OrganisationMembers, {
        as: 'Members'
      });
      Organisation.hasMany(models.Transaction, {
        as: 'Transactions',
        foreignKey: 'OrganisationId'
      });
      Organisation.hasMany(models.FundAccount, {
        as: 'FundingHistories'
      });
      Organisation.hasMany(models.Campaign, {
        as: 'Campaigns',
        foreignKey: 'OrganisationId'
      });
      Organisation.hasMany(models.Wallet, {
        as: 'CampaignWallets',
        foreignKey: 'OrganisationId',
        scope: {
          wallet_type: 'organisation'
        }
      });

      Organisation.belongsToMany(models.Campaign, {
        through: {
          model: models.AssociatedCampaign
        },
        as: 'associatedCampaigns',
        foreignKey: 'DonorId'
      });

      Organisation.hasOne(models.Wallet, {
        as: 'Wallet',
        foreignKey: 'OrganisationId',
        scope: {
          wallet_type: 'organisation',
          CampaignId: null
        }
      });
    }
  }
  Organisation.init(
    {
      name: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue('email', value.toLowerCase());
        }
      },
      phone: DataTypes.STRING,
      address: DataTypes.STRING,
      state: DataTypes.STRING,
      country: DataTypes.STRING,
      logo_link: DataTypes.STRING,
      website_url: DataTypes.STRING,
      registration_id: DataTypes.STRING,
      year_of_inception: DataTypes.STRING,
      profile_completed: DataTypes.BOOLEAN,
      is_verified: DataTypes.BOOLEAN,
      about: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'Organisation'
    }
  );
  return Organisation;
};
