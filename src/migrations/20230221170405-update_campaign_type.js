'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Campaigns', 'type');
    await queryInterface.addColumn('Campaigns', 'type', {
      type: Sequelize.ENUM('campaign', 'cash-for-work', 'item'),
      defaultValue: 'campaign'
    });
    await queryInterface.addColumn('Campaigns', 'minting_limit', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // await queryInterface.removeColumn('Campaigns', 'type');
    await queryInterface.addColumn('Campaigns', 'type', {
      type: Sequelize.STRING,
      defaultValue: 'campaign'
    });
    await queryInterface.removeColumn('Campaigns', 'minting_limit');
  }
};
