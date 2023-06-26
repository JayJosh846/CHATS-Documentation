'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class VerificationToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      VerificationToken.belongsTo(models.User, {
        foreignKey: "UserId",
        as: "User"
      });
    }
  };
  VerificationToken.init({
    UserId: DataTypes.INTEGER,
    type: DataTypes.STRING,
    token: DataTypes.STRING,
    request_ip: DataTypes.STRING,
    expires_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'VerificationToken',
    tableName: 'VerificationTokens'
  });

  VerificationToken.prototype.toObject = function() {
    const data = this.toJSON();
    delete data.token;
    delete data.UserId;
    return data;
  }

  return VerificationToken;
};