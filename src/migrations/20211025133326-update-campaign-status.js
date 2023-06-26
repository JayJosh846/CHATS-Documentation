'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Campaigns', 'status');
    await queryInterface.addColumn('Campaigns', 'is_processing', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: true
    });
    await queryInterface.addColumn('Campaigns', 'status', {
      type: Sequelize.ENUM(
        'pending',
        'ongoing',
        'active',
        'paused',
        'completed',
        'ended'
      ),
      defaultValue: 'pending'
    });
    await queryInterface.addColumn('Campaigns', 'paused_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Campaigns', 'status');
    await queryInterface.removeColumn('Campaigns', 'is_processing');
    await queryInterface.removeColumn('Campaigns', 'paused_date');
  }
};
