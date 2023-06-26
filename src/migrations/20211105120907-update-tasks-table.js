'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    queryInterface.removeColumn('Tasks', 'approval');
    queryInterface.removeColumn('Tasks', 'status');
    // Number of task to be assigned
    queryInterface.addColumn('Tasks', 'assignment_count', {
      type: Sequelize.INTEGER,
      comments: 'Number of task to be assigned',
      defaultValue: 1
    });
    queryInterface.addColumn('Tasks', 'assigned', {
      type: Sequelize.INTEGER,
      comments: 'Number of same task assigned to beneficiaries assigned',
      defaultValue: 0
    });
    queryInterface.addColumn('Tasks', 'require_vendor_approval', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });
    queryInterface.addColumn('Tasks', 'require_agent_approval', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });
    queryInterface.addColumn('Tasks', 'require_evidence', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    queryInterface.removeColumn('Tasks', 'assignment_count');
    queryInterface.removeColumn('Tasks', 'assigned');
    queryInterface.removeColumn('Tasks', 'require_vendor_approval');
    queryInterface.removeColumn('Tasks', 'require_agent_approval');
    queryInterface.addColumn('Tasks', 'status', {
      type: Sequelize.ENUM("fulfilled", "pending"),
      defaultValue: "pending",
    });
    queryInterface.addColumn('Tasks', 'approval', {
      type: Sequelize.STRING,
      defaultValue: "both",
    });
  }
};