'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('FundAccounts', 'service', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'channel'
    });
    await queryInterface.addColumn('FundAccounts', 'approved', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: 'status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('FundAccounts', 'service');
    await queryInterface.removeColumn('FundAccounts', 'approved')
  }
};