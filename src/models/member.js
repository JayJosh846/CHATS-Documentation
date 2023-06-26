'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Member extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Member.init(
    {
      full_name: DataTypes.STRING,
      dob: DataTypes.DATE,
      profile_pic: DataTypes.STRING,
      group_id: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'Member'
    }
  );
  return Member;
};
