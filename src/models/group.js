'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Group.hasMany(models.Member, {
        as: 'group_members',
        foreignKey: 'group_id'
      });
    }
  }
  Group.init(
    {
      group_name: DataTypes.STRING,
      representative_id: DataTypes.INTEGER,
      group_category: DataTypes.ENUM(
        'family',
        'community',
        'interest-group',
        'associations'
      )
    },
    {
      sequelize,
      modelName: 'Group'
    }
  );
  return Group;
};
