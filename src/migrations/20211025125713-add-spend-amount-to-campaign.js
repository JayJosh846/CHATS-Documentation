'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Campaigns', 'amount_disbursed', {
      type: Sequelize.FLOAT,
      defaultValue: 0.00,
      after: 'budget'
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Campaigns', 'amount_disbursed');
  }
};
