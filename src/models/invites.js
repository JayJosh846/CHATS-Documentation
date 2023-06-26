'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Invites extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Invites.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
    email: DataTypes.STRING,
    token: DataTypes.STRING,
    inviterId: DataTypes.INTEGER,
    CampaignId: DataTypes.INTEGER,
    isAdded: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Invites',
  });
  return Invites;
};