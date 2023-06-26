'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('FundAccounts', 'CampaignId', {
      allowNull: true,
      type: Sequelize.INTEGER,
      references: {
        model: {
          tableName: 'Campaigns'
        },
        key: 'id'
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('FundAccounts', 'CampaignId');
  }
};
