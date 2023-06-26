'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn(
      'Invites',
      'CampaignId',
      {
        type: Sequelize.INTEGER
      }
    )
    await queryInterface.addColumn(
      'Invites',
      'isAdded',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     await queryInterface.removeColumn('Invites', 'CampaignId');
     await queryInterface.removeColumn('Invites', 'isAdded');
  }
};
