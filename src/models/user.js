'use strict';
const {Model} = require('sequelize');
const {AclRoles} = require('../utils');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    capitalizeFirstLetter(str) {
      let string = str.toLowerCase();
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // User.hasMany(models.Campaign, { as: 'campaigns' });
      // User.hasMany(models.Login, { as: 'logins' });

      User.hasMany(models.Transaction, {
        as: 'OrderTransaction',
        foreignKey: 'BeneficiaryId'
        // scope: {
        //   transaction_type: 'order'
        // }
      });

      User.belongsToMany(models.Campaign, {
        as: 'Campaigns',
        foreignKey: 'UserId',
        through: models.Beneficiary
      });

      // User.hasMany(models.Campaign, {
      //   as: 'VendorCampaigns',
      //   foreignKey: 'UserId'
      // });

      User.hasMany(models.Complaint, {
        as: 'Complaints',
        foreignKey: 'UserId'
      });
      User.hasMany(models.FormAnswer, {
        as: 'Answers',
        foreignKey: 'beneficiaryId'
      });

      User.hasMany(models.Wallet, {
        as: 'Wallet',
        foreignKey: 'UserId',
        constraints: false,
        scope: {
          wallet_type: 'user'
        }
      });
      User.hasMany(models.Wallet, {
        as: 'Wallets',
        foreignKey: 'UserId',
        constraints: false,
        scope: {
          wallet_type: 'user'
        }
      });
      ////////////////////////
      User.hasOne(models.Market, {
        as: 'Store',
        foreignKey: 'UserId'
      });
      User.hasMany(models.Order, {
        as: 'Orders',
        foreignKey: 'VendorId',
        scope: {
          RoleId: AclRoles.Vendor
        }
      });
      User.hasMany(models.Transaction, {
        as: 'StoreTransactions',
        foreignKey: 'VendorId',
        scope: {
          transaction_origin: 'store'
        }
      });
      User.hasMany(models.OrganisationMembers, {
        as: 'AssociatedOrganisations'
      });
      User.belongsToMany(models.Organisation, {
        as: 'Organisations',
        through: models.OrganisationMembers
      });
      User.hasMany(models.FingerPrints, {
        as: 'Print'
      });
      User.hasMany(models.BankAccount, {
        as: 'BankAccounts'
      });
      User.hasOne(models.Group, {
        as: 'members',
        foreignKey: 'representative_id'
      });
      User.hasMany(models.VerificationToken, {
        as: 'VerificationTokens'
      });
      User.hasMany(models.TaskAssignment, {
        as: 'Assignments'
      });
      User.belongsTo(models.Role, {
        foreignKey: 'RoleId',
        as: 'Role'
      });
      User.belongsToMany(models.Product, {
        foreignKey: 'vendorId',
        through: 'VendorProduct',
        as: 'ProductVendors'
      });
      //Product.belongsToMany(models.User, { foreignKey: 'productId', as: 'ProductVendors', through: 'VendorProduct'  })
    }
  }
  User.init(
    {
      referal_id: DataTypes.STRING,
      RoleId: DataTypes.INTEGER,
      first_name: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue('first_name', this.capitalizeFirstLetter(value));
        }
      },
      last_name: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue('last_name', this.capitalizeFirstLetter(value));
        }
      },
      email: {
        type: DataTypes.STRING,
        set(value) {
          this.setDataValue('email', value.toLowerCase());
        }
      },
      username: DataTypes.STRING,
      password: DataTypes.STRING,
      phone: DataTypes.STRING,
      bvn: DataTypes.STRING,
      nin: DataTypes.STRING,
      marital_status: DataTypes.STRING,
      gender: DataTypes.STRING,
      status: DataTypes.ENUM('suspended', 'activated', 'pending'),
      location: DataTypes.STRING,
      country: DataTypes.STRING,
      currency: DataTypes.STRING,
      pin: DataTypes.STRING,
      address: DataTypes.STRING,
      vendor_id: DataTypes.STRING,
      device_imei: DataTypes.STRING,
      is_email_verified: DataTypes.BOOLEAN,
      is_phone_verified: DataTypes.BOOLEAN,
      is_bvn_verified: DataTypes.BOOLEAN,
      is_nin_verified: DataTypes.BOOLEAN,
      is_self_signup: DataTypes.BOOLEAN,
      is_public: DataTypes.BOOLEAN,
      is_tfa_enabled: DataTypes.BOOLEAN,
      tfa_secret: DataTypes.STRING,
      tfa_method: DataTypes.ENUM('qrCode', 'email', 'sms'),
      iris: DataTypes.JSON,
      last_login: DataTypes.DATE,
      profile_pic: DataTypes.STRING,
      nfc: DataTypes.STRING,
      dob: DataTypes.DATE,
      tfa_binded_date: DataTypes.DATE,
      is_verified: DataTypes.BOOLEAN,
      is_verified_all: DataTypes.BOOLEAN,
      registration_type: DataTypes.ENUM('individual', 'organisation')
    },
    {
      sequelize,
      modelName: 'User'
    }
  );

  User.prototype.toObject = function () {
    const user = this.toJSON();
    delete user.password;
    delete user.tfa_secret;
    delete user.pin;
    return user;
  };
  return User;
};
