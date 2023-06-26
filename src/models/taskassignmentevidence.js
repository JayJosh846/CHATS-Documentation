'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TaskAssignmentEvidence extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TaskAssignmentEvidence.belongsTo(models.TaskAssignment, {
        as: 'Assignment',
        foreignKey: 'TaskAssignmentId'
      });
    }
  }

  TaskAssignmentEvidence.init(
    {
      TaskAssignmentId: DataTypes.INTEGER,
      comment: DataTypes.TEXT,
      uploads: DataTypes.ARRAY(DataTypes.STRING),
      type: DataTypes.ENUM('image', 'video', null),
      source: DataTypes.ENUM('beneficiary', 'field_agent', 'vendor'),
      location: DataTypes.JSON
    },
    {
      sequelize,
      modelName: 'TaskAssignmentEvidence'
    }
  );
  return TaskAssignmentEvidence;
};
