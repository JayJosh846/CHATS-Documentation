'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PasswordResetToken extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PasswordResetToken.belongsTo(models.User, {
        foreignKey: "UserId",
        as: "User"
      });
    }
  };
  PasswordResetToken.init({
    ref: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    UserId: DataTypes.INTEGER,
    token: DataTypes.STRING,
    request_ip: DataTypes.STRING,
    expires_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'PasswordResetToken',
    tableName: 'PasswordResetTokens'
  });

  PasswordResetToken.prototype.toObject = function() {
    const data = this.toJSON();
    delete data.token;
    delete data.UserId;
    return data;
  }
  return PasswordResetToken;
};