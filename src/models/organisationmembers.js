'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrganisationMembers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      OrganisationMembers.belongsTo(models.Organisation, { foreignKey: 'OrganisationId', as: 'Organisation' })
      OrganisationMembers.belongsTo(models.User, { foreignKey: 'UserId', as: 'User' })
    }
  };
  OrganisationMembers.init({
    UserId: DataTypes.INTEGER,
    OrganisationId: DataTypes.INTEGER,
    role: DataTypes.ENUM('admin', 'member', 'vendor')
  }, {
    sequelize,
    modelName: 'OrganisationMembers',
  });
  return OrganisationMembers;
};
