'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TaskAssignment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TaskAssignment.belongsTo(models.Task, {
        as: 'Task',
        foreignKey: 'TaskId'
      });
      TaskAssignment.belongsTo(models.User, {
        as: 'Worker',
        foreignKey: 'UserId'
      });
      TaskAssignment.hasMany(models.TaskAssignmentEvidence, {
        as: 'SubmittedEvidences',
        foreignKey: 'id'
      });
      TaskAssignment.hasOne(models.User, {
        as: 'Approver',
        foreignKey: 'id',
        targetKey: 'approved_by',
        constraints: false
      })
    }
  };
  TaskAssignment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    TaskId: DataTypes.INTEGER,
    UserId: DataTypes.INTEGER,
    uploaded_evidence: DataTypes.BOOLEAN,
    approved_by_agent: DataTypes.BOOLEAN,
    approved_by_vendor: DataTypes.BOOLEAN,
    approved: DataTypes.BOOLEAN,
    approved_by: DataTypes.INTEGER,
    approved_at: DataTypes.DATE,
    status: DataTypes.ENUM('pending','in progress', 'rejected', 'disbursed', 'approved', 'completed'), //approved -> recieved approval from NGO admin | completed -> paid
  }, {
    sequelize,
    modelName: 'TaskAssignment',
  });
  return TaskAssignment;
};