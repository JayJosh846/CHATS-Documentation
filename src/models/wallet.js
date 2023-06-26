'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Wallet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

    static associate(models) {
      Wallet.belongsTo(models.User, {
        as: 'User',
        foreignKey: 'UserId'
      });
      Wallet.hasMany(models.Transaction, {
        as: 'ReceivedTransactions',
        foreignKey: 'ReceiverWalletId'
      });
      Wallet.hasMany(models.Transaction, {
        as: 'SentTransactions',
        foreignKey: 'SenderWalletId'
      });
      Wallet.belongsTo(models.Organisation, {
        as: 'Organisation',
        foreignKey: 'OrganisationId'
      });

      Wallet.belongsTo(models.Campaign, {
        as: 'Campaign',
        foreignKey: 'CampaignId'
      });
    }
  }
  Wallet.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      address: DataTypes.STRING,
      was_funded: DataTypes.BOOLEAN,
      privateKey: DataTypes.STRING,
      bantuAddress: DataTypes.STRING,
      bantuPrivateKey: DataTypes.STRING,
      tokenIds: DataTypes.JSON,
      CampaignId: DataTypes.INTEGER,
      OrganisationId: DataTypes.INTEGER,
      wallet_type: DataTypes.ENUM('user', 'organisation'),
      UserId: DataTypes.INTEGER,
      balance: DataTypes.FLOAT,
      crypto_balance: DataTypes.FLOAT,
      fiat_balance: DataTypes.FLOAT,
      local_currency: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'Wallet'
    }
  );
  Wallet.prototype.toObject = function () {
    const wallet = this.toJSON();
    delete wallet.privateKey;
    delete wallet.bantuPrivateKey;
    return wallet;
  };
  return Wallet;
};
