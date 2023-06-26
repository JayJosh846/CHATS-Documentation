'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('BankAccounts', 'account_name', {
      allowNull: true,
      type: Sequelize.STRING
    })
    await queryInterface.addColumn('BankAccounts', 'bank_code', {
      allowNull: true,
      type: Sequelize.STRING
    })
    await queryInterface.addColumn('BankAccounts', 'recipient_code', {
      allowNull: true,
      type: Sequelize.STRING
    })
    await queryInterface.addColumn('BankAccounts', 'type', {
      allowNull: true,
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     await queryInterface.dropColumn('BankAccounts', 'account_name')
     await queryInterface.dropColumn('BankAccounts', 'bank_code')
     await queryInterface.dropColumn('BankAccounts', 'recipient_code')
     await queryInterface.dropColumn('BankAccounts', 'type')
  }
};
