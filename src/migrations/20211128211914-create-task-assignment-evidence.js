'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TaskAssignmentEvidences', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      TaskAssignmentId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'TaskAssignments',
          },
          key: 'id'
        }
      },
      comment: {
        allowNull: false,
        type: Sequelize.TEXT
      },
      uploads: {
        allowNull: true,
        type: Sequelize.ARRAY(Sequelize.STRING)
      },
      type: {
        allowNull: true,
        type: Sequelize.ENUM('image', 'video'),
        defaultValue: null
      },
      source: {
        type: Sequelize.ENUM('beneficiary', 'field_agent', 'vendor')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('TaskAssignmentEvidences');
  }
};